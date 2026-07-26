/** 文件职责：实现第三方登录、邮箱认证、密码登录及会话生命周期管理。 */
import { randomInt } from 'crypto';
import { compare, hash } from 'bcryptjs';
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  isNull,
} from 'drizzle-orm';
import { Resend } from 'resend';
import {
  AuthDevice,
  AuthProvider,
  AuthSessionResponse,
} from '@/receiptly-api/contracts/auth';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import {
  getReceiptlyDb,
  householdMembers,
  households,
  receiptlyAuthChallenges,
  receiptlyAuthIdentities,
  receiptlyEmailLoginCodes,
  receiptlyProviderCredentials,
  receiptlySessions,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { encryptProviderToken } from '@/receiptly-api/infrastructure/auth/provider-credentials';
import {
  exchangeAppleAuthorizationCode,
  ProviderIdentity,
  verifyAppleIdentity,
  verifyGoogleIdentity,
} from '@/receiptly-api/infrastructure/auth/providers';
import {
  createAccessToken,
  createRefreshToken,
  hashLoginSecret,
  hashToken,
} from '@/receiptly-api/infrastructure/auth/tokens';

const ACCESS_TOKEN_EXPIRES_IN = 900 as const;
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;
const EMAIL_CODE_LIFETIME_MS = 10 * 60 * 1000;
const EMAIL_RESEND_DELAY_MS = 60 * 1000;
const EMAIL_MAX_ATTEMPTS = 5;
const EMAIL_MAX_SENDS_PER_HOUR = 5;
const PASSWORD_HASH_ROUNDS = 12;
const PASSWORD_MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_LOCK_MS = 15 * 60 * 1000;
// 对不存在的账号也执行有效 bcrypt Hash 比对，使计算耗时接近真实账号，
// 降低通过响应时序判断账号是否存在的风险。
const DUMMY_PASSWORD_HASH = '$2a$12$AK34kVZ6G8ngtozKoFDPYOf1Q48z72If2mYSuW.oUHHaJuceRpjUW';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const loadHouseholds = async (userId: string) => getReceiptlyDb()
  .select({
    id: households.id,
    name: households.name,
    role: householdMembers.role,
    timezone: households.timezone,
    currency: households.currency,
  })
  .from(householdMembers)
  .innerJoin(households, eq(householdMembers.householdId, households.id))
  .where(and(
    eq(householdMembers.userId, userId),
    eq(householdMembers.status, 'active'),
    isNull(households.deletedAt),
  ));

const sessionResponse = async (
  user: { id: string; email: string | null; displayName: string | null },
  session: { id: string; refreshToken: string },
  isNewUser: boolean,
): Promise<AuthSessionResponse> => {
  const userHouseholds = await loadHouseholds(user.id);
  const activeHouseholdId = userHouseholds.length === 1 ? userHouseholds[0].id : null;
  let onboardingState: 'needs_profile' | 'needs_household' | 'ready' = 'ready';
  if (!user.displayName) onboardingState = 'needs_profile';
  else if (userHouseholds.length === 0) onboardingState = 'needs_household';
  return {
    accessToken: await createAccessToken(user.id, session.id),
    refreshToken: session.refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    sessionId: session.id,
    user,
    households: userHouseholds,
    activeHouseholdId,
    onboardingState,
    isNewUser,
  };
};

const createSession = async (
  userId: string,
  device: AuthDevice,
  tokenFamilyId = crypto.randomUUID(),
  rotatedFromSessionId: string | null = null,
) => {
  const refreshToken = createRefreshToken();
  const [session] = await getReceiptlyDb().insert(receiptlySessions).values({
    userId,
    tokenFamilyId,
    refreshTokenHash: hashToken(refreshToken),
    rotatedFromSessionId,
    installationId: device.installationId,
    deviceName: device.name,
    platform: device.platform,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
  }).returning({ id: receiptlySessions.id });
  return { id: session.id, refreshToken };
};

/**
 * 创建一次性 OAuth 登录尝试，将 Provider、state 和 nonce 绑定到短期服务端记录。
 * 数据库只保存 state 的 HMAC。
 */
export const createLoginChallenge = async (provider: Exclude<AuthProvider, 'email'>) => {
  const rawNonce = createRefreshToken();
  const state = createRefreshToken();
  const [challenge] = await getReceiptlyDb().insert(receiptlyAuthChallenges).values({
    provider,
    rawNonce,
    stateHash: hashLoginSecret(state),
    expiresAt: new Date(Date.now() + CHALLENGE_LIFETIME_MS),
  }).returning({ id: receiptlyAuthChallenges.id });
  return {
    attemptId: challenge.id,
    nonce: rawNonce,
    state,
    expiresIn: 300,
  };
};

const readChallenge = async (
  provider: Exclude<AuthProvider, 'email'>,
  attemptId: string,
  state: string,
) => {
  const [challenge] = await getReceiptlyDb()
    .select()
    .from(receiptlyAuthChallenges)
    .where(and(
      eq(receiptlyAuthChallenges.id, attemptId),
      eq(receiptlyAuthChallenges.provider, provider),
      isNull(receiptlyAuthChallenges.consumedAt),
    ))
    .limit(1);
  if (!challenge || challenge.expiresAt <= new Date()) {
    throw new ReceiptlyError(401, 'LOGIN_ATTEMPT_EXPIRED', '登录请求已过期，请重试。');
  }
  if (challenge.stateHash !== hashLoginSecret(state)) {
    throw new ReceiptlyError(401, 'LOGIN_STATE_INVALID', '登录 state 无效。');
  }
  return challenge;
};

const consumeChallenge = async (attemptId: string) => {
  const [consumed] = await getReceiptlyDb()
    .update(receiptlyAuthChallenges)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(receiptlyAuthChallenges.id, attemptId),
      isNull(receiptlyAuthChallenges.consumedAt),
      gt(receiptlyAuthChallenges.expiresAt, new Date()),
    ))
    .returning({ id: receiptlyAuthChallenges.id });
  if (!consumed) throw new ReceiptlyError(401, 'LOGIN_ATTEMPT_EXPIRED', '登录请求已使用或已过期。');
};

const existingMethodsForEmail = async (email: string) => getReceiptlyDb()
  .select({ provider: receiptlyAuthIdentities.provider })
  .from(receiptlyAuthIdentities)
  .innerJoin(receiptlyUsers, eq(receiptlyAuthIdentities.userId, receiptlyUsers.id))
  .where(and(
    eq(receiptlyUsers.email, email),
    isNull(receiptlyAuthIdentities.revokedAt),
    isNull(receiptlyUsers.deletedAt),
  ));

const findOrCreateIdentity = async (
  provider: AuthProvider,
  identity: ProviderIdentity,
  profile: Record<string, unknown> | null,
) => {
  const db = getReceiptlyDb();
  const [existing] = await db
    .select({
      identityId: receiptlyAuthIdentities.id,
      userId: receiptlyUsers.id,
      email: receiptlyUsers.email,
      displayName: receiptlyUsers.displayName,
    })
    .from(receiptlyAuthIdentities)
    .innerJoin(receiptlyUsers, eq(receiptlyAuthIdentities.userId, receiptlyUsers.id))
    .where(and(
      eq(receiptlyAuthIdentities.provider, provider),
      eq(receiptlyAuthIdentities.providerSubject, identity.subject),
      isNull(receiptlyAuthIdentities.revokedAt),
      isNull(receiptlyUsers.deletedAt),
    ))
    .limit(1);
  if (existing) {
    await db.update(receiptlyAuthIdentities).set({
      lastLoginAt: new Date(),
      providerEmail: identity.email ?? undefined,
      providerEmailVerifiedAt: identity.emailVerified ? new Date() : undefined,
    }).where(eq(receiptlyAuthIdentities.id, existing.identityId));
    return { ...existing, isNewUser: false };
  }

  if (provider !== 'email' && identity.email) {
    // 邮箱相同不能证明两个 Provider 身份属于同一个人；
    // 账号关联必须由已登录用户明确发起。
    const methods = await existingMethodsForEmail(identity.email);
    if (methods.length > 0) {
      throw new ReceiptlyError(409, 'ACCOUNT_LINK_REQUIRED', '该邮箱已关联其他登录方式，请先使用原方式登录。', {
        existingMethods: [...new Set(methods.map(({ provider: method }) => method))],
      });
    }
  }

  if (provider === 'email' && identity.email) {
    const [legacyUser] = await db.select({
      id: receiptlyUsers.id,
      email: receiptlyUsers.email,
      displayName: receiptlyUsers.displayName,
    }).from(receiptlyUsers).where(and(
      eq(receiptlyUsers.email, identity.email),
      isNull(receiptlyUsers.deletedAt),
    )).limit(1);
    if (legacyUser) {
      const [createdIdentity] = await db.insert(receiptlyAuthIdentities).values({
        userId: legacyUser.id,
        provider,
        providerSubject: identity.subject,
        providerEmail: identity.email,
        providerEmailVerifiedAt: new Date(),
      }).returning({ identityId: receiptlyAuthIdentities.id });
      return {
        ...legacyUser,
        ...createdIdentity,
        userId: legacyUser.id,
        isNewUser: false,
      };
    }
  }

  return db.transaction(async (tx) => {
    const [user] = await tx.insert(receiptlyUsers).values({
      email: identity.email,
      displayName: identity.displayName,
      emailVerifiedAt: identity.emailVerified ? new Date() : null,
    }).returning({
      id: receiptlyUsers.id,
      email: receiptlyUsers.email,
      displayName: receiptlyUsers.displayName,
    });
    const [createdIdentity] = await tx.insert(receiptlyAuthIdentities).values({
      userId: user.id,
      provider,
      providerSubject: identity.subject,
      providerEmail: identity.email,
      providerEmailVerifiedAt: identity.emailVerified ? new Date() : null,
      profile,
    }).returning({ identityId: receiptlyAuthIdentities.id });
    return {
      ...user,
      ...createdIdentity,
      userId: user.id,
      isNewUser: true,
    };
  });
};

const completeLogin = async (
  provider: AuthProvider,
  identity: ProviderIdentity,
  profile: Record<string, unknown> | null,
  device: AuthDevice,
) => {
  const result = await findOrCreateIdentity(provider, identity, profile);
  const session = await createSession(result.userId, device);
  return {
    response: await sessionResponse({
      id: result.userId,
      email: result.email,
      displayName: result.displayName,
    }, session, result.isNewUser),
    identityId: result.identityId,
  };
};

/** 验证一次性挑战和 Google 身份后，创建或恢复统一账号会话。 */
export const loginWithGoogle = async (input: {
  attemptId: string;
  state: string;
  idToken: string;
  device: AuthDevice;
}) => {
  await readChallenge('google', input.attemptId, input.state);
  const identity = await verifyGoogleIdentity(input.idToken);
  await consumeChallenge(input.attemptId);
  return (await completeLogin('google', identity, null, input.device)).response;
};

/**
 * 验证 Apple 身份与授权码，并加密保存后续撤销授权所需的 Refresh Token。
 * Apple 姓名可能只在首次授权时返回，因此资料会在首次登录阶段保存。
 */
export const loginWithApple = async (input: {
  attemptId: string;
  state: string;
  identityToken: string;
  authorizationCode: string;
  profile: { email: string | null; givenName: string | null; familyName: string | null };
  device: AuthDevice;
}) => {
  const challenge = await readChallenge('apple', input.attemptId, input.state);
  const verified = await verifyAppleIdentity(input.identityToken, challenge.rawNonce);
  const refreshToken = await exchangeAppleAuthorizationCode(input.authorizationCode);
  await consumeChallenge(input.attemptId);
  const displayName = [input.profile.givenName, input.profile.familyName].filter(Boolean).join(' ') || null;
  const identity = {
    ...verified,
    displayName,
  };
  const result = await completeLogin('apple', identity, input.profile, input.device);
  await getReceiptlyDb().insert(receiptlyProviderCredentials).values({
    identityId: result.identityId,
    encryptedRefreshToken: encryptProviderToken(refreshToken),
    encryptionKeyVersion: process.env.RECEIPTLY_PROVIDER_ENCRYPTION_KEY_VERSION ?? 'v1',
  }).onConflictDoUpdate({
    target: receiptlyProviderCredentials.identityId,
    set: {
      encryptedRefreshToken: encryptProviderToken(refreshToken),
      encryptionKeyVersion: process.env.RECEIPTLY_PROVIDER_ENCRYPTION_KEY_VERSION ?? 'v1',
      validatedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return result.response;
};

const resendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Email login is not configured.');
  return new Resend(apiKey);
};

/**
 * 创建并发送一次性邮箱验证码。
 * 同一邮箱受小时配额和重发间隔限制，数据库只保存验证码 Hash。
 */
export const requestEmailCode = async (emailInput: string, locale: string) => {
  const email = normalizeEmail(emailInput);
  const from = process.env.RECEIPTLY_EMAIL_FROM;
  if (!from) throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Email sender is not configured.');
  const db = getReceiptlyDb();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recentCount] = await db.select({ count: count() }).from(receiptlyEmailLoginCodes).where(and(
    eq(receiptlyEmailLoginCodes.email, email),
    gte(receiptlyEmailLoginCodes.createdAt, hourAgo),
  ));
  if (recentCount.count >= EMAIL_MAX_SENDS_PER_HOUR) {
    throw new ReceiptlyError(429, 'RATE_LIMITED', '验证码请求过于频繁，请稍后重试。', { retryAfter: 3600 });
  }
  const [latest] = await db.select().from(receiptlyEmailLoginCodes).where(and(
    eq(receiptlyEmailLoginCodes.email, email),
    isNull(receiptlyEmailLoginCodes.consumedAt),
  )).orderBy(desc(receiptlyEmailLoginCodes.createdAt))
    .limit(1);
  if (latest && latest.resendAvailableAt > new Date()) {
    throw new ReceiptlyError(429, 'RATE_LIMITED', '请稍后再发送验证码。', {
      retryAfter: Math.ceil((latest.resendAvailableAt.getTime() - Date.now()) / 1000),
    });
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeId = crypto.randomUUID();
  // 将 Hash 与记录 ID、标准化邮箱绑定，避免验证码在另一条记录上被重放。
  await db.insert(receiptlyEmailLoginCodes).values({
    id: codeId,
    email,
    codeHash: hashLoginSecret(`${codeId}:${email}:${code}`),
    expiresAt: new Date(Date.now() + EMAIL_CODE_LIFETIME_MS),
    resendAvailableAt: new Date(Date.now() + EMAIL_RESEND_DELAY_MS),
  });
  const subject = locale.toLowerCase().startsWith('zh')
    ? '您的 Receiptly 登录/注册验证码'
    : 'Your Receiptly verification code';
  const message = locale.toLowerCase().startsWith('zh')
    ? `您的验证码是 ${code}，10 分钟内有效。请勿将验证码告诉他人。`
    : `Your login code is ${code}. It expires in 10 minutes. Do not share it.`;
  try {
    const { error } = await resendClient().emails.send({
      from,
      to: email,
      subject,
      text: message,
    });
    if (error) throw new Error(error.message);
  } catch {
    // 邮件发送失败后立即消费该记录，避免未送达验证码继续有效并干扰后续重发。
    await db.update(receiptlyEmailLoginCodes).set({ consumedAt: new Date() }).where(
      eq(receiptlyEmailLoginCodes.id, codeId),
    );
    throw new ReceiptlyError(503, 'EMAIL_DELIVERY_FAILED', '验证码邮件暂时无法发送。');
  }
  return { expiresIn: 600, resendAfter: 60 };
};

const consumeEmailCode = async (email: string, code: string) => {
  const db = getReceiptlyDb();
  const [loginCode] = await db.select().from(receiptlyEmailLoginCodes).where(and(
    eq(receiptlyEmailLoginCodes.email, email),
    isNull(receiptlyEmailLoginCodes.consumedAt),
  )).orderBy(desc(receiptlyEmailLoginCodes.createdAt))
    .limit(1);
  if (!loginCode || loginCode.expiresAt <= new Date()) {
    throw new ReceiptlyError(401, 'EMAIL_CODE_EXPIRED', '验证码已过期，请重新获取。');
  }
  if (loginCode.attemptCount >= EMAIL_MAX_ATTEMPTS) {
    throw new ReceiptlyError(401, 'EMAIL_CODE_INVALID', '验证码尝试次数过多，请重新获取。');
  }
  const codeHash = hashLoginSecret(`${loginCode.id}:${email}:${code}`);
  if (codeHash !== loginCode.codeHash) {
    await db.update(receiptlyEmailLoginCodes).set({
      attemptCount: loginCode.attemptCount + 1,
    }).where(eq(receiptlyEmailLoginCodes.id, loginCode.id));
    throw new ReceiptlyError(401, 'EMAIL_CODE_INVALID', '验证码不正确。', {
      remainingAttempts: Math.max(0, EMAIL_MAX_ATTEMPTS - loginCode.attemptCount - 1),
    });
  }
  const [consumed] = await db.update(receiptlyEmailLoginCodes).set({
    consumedAt: new Date(),
  }).where(and(
    eq(receiptlyEmailLoginCodes.id, loginCode.id),
    isNull(receiptlyEmailLoginCodes.consumedAt),
  )).returning({ id: receiptlyEmailLoginCodes.id });
  if (!consumed) throw new ReceiptlyError(401, 'EMAIL_CODE_INVALID', '验证码已使用。');
};

/** 消费一次性邮箱验证码，并创建或恢复兼容的无密码邮箱会话。 */
export const verifyEmailCode = async (emailInput: string, code: string, device: AuthDevice) => {
  const email = normalizeEmail(emailInput);
  await consumeEmailCode(email, code);
  return (await completeLogin('email', {
    subject: email,
    email,
    emailVerified: true,
    // 邮箱 MVP 没有独立资料页，先使用邮箱本地部分作为可编辑昵称，
    // 让新用户直接进入家庭创建流程。
    displayName: email.split('@')[0],
  }, null, device)).response;
};

/**
 * 使用已验证邮箱注册密码账号。
 * 支持为旧版无密码邮箱账号补充密码，但不会自动合并第三方登录身份。
 */
export const registerWithEmailPassword = async (input: {
  email: string;
  password: string;
  code: string;
  displayName: string | null;
  device: AuthDevice;
}) => {
  const email = normalizeEmail(input.email);
  const db = getReceiptlyDb();
  const [existingUser] = await db.select({
    id: receiptlyUsers.id,
    email: receiptlyUsers.email,
    displayName: receiptlyUsers.displayName,
    passwordHash: receiptlyUsers.passwordHash,
  }).from(receiptlyUsers).where(and(
    eq(receiptlyUsers.email, email),
    isNull(receiptlyUsers.deletedAt),
  )).limit(1);

  if (existingUser?.passwordHash) {
    throw new ReceiptlyError(409, 'EMAIL_ALREADY_REGISTERED', '该邮箱已注册，请直接登录。');
  }

  let existingEmailIdentityId: string | null = null;
  if (existingUser) {
    const [emailIdentity] = await db.select({
      id: receiptlyAuthIdentities.id,
    }).from(receiptlyAuthIdentities).where(and(
      eq(receiptlyAuthIdentities.userId, existingUser.id),
      eq(receiptlyAuthIdentities.provider, 'email'),
      isNull(receiptlyAuthIdentities.revokedAt),
    )).limit(1);
    if (!emailIdentity) {
      const methods = await existingMethodsForEmail(email);
      throw new ReceiptlyError(
        409,
        'ACCOUNT_LINK_REQUIRED',
        '该邮箱已关联其他登录方式，请先使用原方式登录。',
        { existingMethods: [...new Set(methods.map(({ provider }) => provider))] },
      );
    }
    existingEmailIdentityId = emailIdentity.id;
  }

  const passwordHash = await hash(input.password, PASSWORD_HASH_ROUNDS);
  await consumeEmailCode(email, input.code);
  const displayName = input.displayName ?? email.split('@')[0];
  // 用户与身份记录必须原子写入，避免出现已保存密码但没有可用登录身份的账号。
  const result = await db.transaction(async (tx) => {
    if (existingUser && existingEmailIdentityId) {
      const [user] = await tx.update(receiptlyUsers).set({
        passwordHash,
        displayName: existingUser.displayName ?? displayName,
        emailVerifiedAt: new Date(),
        passwordFailedAttempts: 0,
        passwordLockedUntil: null,
        updatedAt: new Date(),
      }).where(and(
        eq(receiptlyUsers.id, existingUser.id),
        isNull(receiptlyUsers.passwordHash),
      )).returning({
        id: receiptlyUsers.id,
        email: receiptlyUsers.email,
        displayName: receiptlyUsers.displayName,
      });
      if (!user) {
        throw new ReceiptlyError(409, 'EMAIL_ALREADY_REGISTERED', '该邮箱已注册，请直接登录。');
      }
      await tx.update(receiptlyAuthIdentities).set({
        providerEmailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      }).where(eq(receiptlyAuthIdentities.id, existingEmailIdentityId));
      return { ...user, isNewUser: false };
    }

    const [user] = await tx.insert(receiptlyUsers).values({
      email,
      passwordHash,
      displayName,
      emailVerifiedAt: new Date(),
    }).returning({
      id: receiptlyUsers.id,
      email: receiptlyUsers.email,
      displayName: receiptlyUsers.displayName,
    });
    await tx.insert(receiptlyAuthIdentities).values({
      userId: user.id,
      provider: 'email',
      providerSubject: email,
      providerEmail: email,
      providerEmailVerifiedAt: new Date(),
    });
    return { ...user, isNewUser: true };
  });
  const session = await createSession(result.id, input.device);
  return sessionResponse(result, session, result.isNewUser);
};

/**
 * 使用邮箱和密码登录。
 * 失败次数按账号累计并触发临时锁定，未知账号也执行等价 bcrypt 比对。
 */
export const loginWithEmailPassword = async (
  emailInput: string,
  password: string,
  device: AuthDevice,
) => {
  const email = normalizeEmail(emailInput);
  const db = getReceiptlyDb();
  const [account] = await db.select({
    id: receiptlyUsers.id,
    email: receiptlyUsers.email,
    displayName: receiptlyUsers.displayName,
    passwordHash: receiptlyUsers.passwordHash,
    passwordFailedAttempts: receiptlyUsers.passwordFailedAttempts,
    passwordLockedUntil: receiptlyUsers.passwordLockedUntil,
    identityId: receiptlyAuthIdentities.id,
  }).from(receiptlyUsers)
    .innerJoin(receiptlyAuthIdentities, and(
      eq(receiptlyAuthIdentities.userId, receiptlyUsers.id),
      eq(receiptlyAuthIdentities.provider, 'email'),
      isNull(receiptlyAuthIdentities.revokedAt),
    ))
    .where(and(
      eq(receiptlyUsers.email, email),
      eq(receiptlyUsers.status, 'active'),
      isNull(receiptlyUsers.deletedAt),
    ))
    .limit(1);

  if (account?.passwordLockedUntil && account.passwordLockedUntil > new Date()) {
    throw new ReceiptlyError(429, 'RATE_LIMITED', '密码尝试次数过多，请稍后重试。', {
      retryAfter: Math.ceil((account.passwordLockedUntil.getTime() - Date.now()) / 1000),
    });
  }

  const passwordMatches = await compare(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!account?.passwordHash || !passwordMatches) {
    if (account) {
      const failedAttempts = (account.passwordLockedUntil ? 0 : account.passwordFailedAttempts) + 1;
      await db.update(receiptlyUsers).set({
        passwordFailedAttempts: failedAttempts,
        passwordLockedUntil: failedAttempts >= PASSWORD_MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + PASSWORD_LOCK_MS)
          : null,
        updatedAt: new Date(),
      }).where(eq(receiptlyUsers.id, account.id));
    }
    throw new ReceiptlyError(401, 'EMAIL_PASSWORD_INVALID', '邮箱或密码不正确。');
  }

  await db.transaction(async (tx) => {
    await tx.update(receiptlyUsers).set({
      passwordFailedAttempts: 0,
      passwordLockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(receiptlyUsers.id, account.id));
    await tx.update(receiptlyAuthIdentities).set({
      lastLoginAt: new Date(),
    }).where(eq(receiptlyAuthIdentities.id, account.identityId));
  });
  const session = await createSession(account.id, device);
  return sessionResponse(account, session, false);
};

/**
 * 轮换 Refresh Token，并把新会话限制在原安装设备。
 * 检测到旧 Token 重放时撤销整个 Token Family。
 */
export const refreshSession = async (refreshToken: string, installationId: string) => {
  const db = getReceiptlyDb();
  const [current] = await db.select().from(receiptlySessions).where(
    eq(receiptlySessions.refreshTokenHash, hashToken(refreshToken)),
  ).limit(1);
  if (!current || current.expiresAt <= new Date() || current.installationId !== installationId) {
    throw new ReceiptlyError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token无效或已过期。');
  }
  if (current.revokedAt) {
    // 已轮换 Token 再次出现，可能意味着泄露或客户端状态失步；
    // 此时撤销整个 Token Family，不能信任任意一份副本。
    await db.update(receiptlySessions).set({
      revokedAt: new Date(),
      revokeReason: 'refresh_token_reuse',
    }).where(eq(receiptlySessions.tokenFamilyId, current.tokenFamilyId));
    throw new ReceiptlyError(401, 'REFRESH_TOKEN_REUSED', '检测到已使用的Refresh Token，当前设备已退出。');
  }

  const nextRefreshToken = createRefreshToken();
  // Token 轮换在事务中完成，确保并发请求中只有一个能撤销当前会话并创建后继会话。
  const result = await db.transaction(async (tx) => {
    const [revoked] = await tx.update(receiptlySessions).set({
      revokedAt: new Date(),
      revokeReason: 'rotated',
      lastUsedAt: new Date(),
    }).where(and(
      eq(receiptlySessions.id, current.id),
      isNull(receiptlySessions.revokedAt),
    )).returning({ id: receiptlySessions.id });
    if (!revoked) return null;
    const [next] = await tx.insert(receiptlySessions).values({
      userId: current.userId,
      tokenFamilyId: current.tokenFamilyId,
      refreshTokenHash: hashToken(nextRefreshToken),
      rotatedFromSessionId: current.id,
      installationId: current.installationId,
      deviceName: current.deviceName,
      platform: current.platform,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
    }).returning({ id: receiptlySessions.id });
    return next;
  });
  if (!result) throw new ReceiptlyError(401, 'REFRESH_TOKEN_REUSED', 'Refresh Token已被使用。');
  return {
    accessToken: await createAccessToken(current.userId, result.id),
    refreshToken: nextRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    sessionId: result.id,
  };
};

/** 撤销当前服务端会话，使其关联的 Access Token 随即失效。 */
export const logoutSession = async (sessionId: string) => {
  await getReceiptlyDb().update(receiptlySessions).set({
    revokedAt: new Date(),
    revokeReason: 'logout',
  }).where(and(
    eq(receiptlySessions.id, sessionId),
    isNull(receiptlySessions.revokedAt),
  ));
};
