/** 文件职责：验证 Google/Apple 身份，并处理 Apple Token 交换与撤销。 */
import { createHash } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from 'jose';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';

export type ProviderIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

const googleAudiences = () => (process.env.RECEIPTLY_GOOGLE_AUDIENCES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

/**
 * 在服务端验证 Google ID Token，并使用 `sub` 作为稳定身份标识。
 * 邮箱只属于资料信息，且仅在 Google 标记为已验证时才接收。
 */
export const verifyGoogleIdentity = async (idToken: string): Promise<ProviderIdentity> => {
  const audiences = googleAudiences();
  if (audiences.length === 0) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Google login is not configured.');
  }
  try {
    const ticket = await new OAuth2Client().verifyIdToken({ idToken, audience: audiences });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.iss || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
      throw new Error('Invalid Google issuer or subject.');
    }
    const { azp } = payload as typeof payload & { azp?: string };
    if (azp && !audiences.includes(azp)) throw new Error('Invalid Google authorized party.');
    const emailVerified = payload.email_verified === true;
    return {
      subject: payload.sub,
      email: emailVerified ? payload.email?.trim().toLowerCase() ?? null : null,
      emailVerified,
      displayName: payload.name?.trim() || null,
    };
  } catch {
    throw new ReceiptlyError(401, 'PROVIDER_TOKEN_INVALID', 'The Google sign-in credential is invalid.');
  }
};

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const appleClientId = () => {
  const value = process.env.RECEIPTLY_APPLE_CLIENT_ID;
  if (!value) throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Apple login is not configured.');
  return value;
};

/**
 * 验证 Apple Identity Token，以及由 Receiptly 原始挑战计算出的 SHA-256 nonce，
 * 防止 Token 在不同登录尝试之间被重放。
 */
export const verifyAppleIdentity = async (
  identityToken: string,
  rawNonce: string,
): Promise<ProviderIdentity> => {
  try {
    const { payload } = await jwtVerify(identityToken, appleJwks, {
      algorithms: ['RS256'],
      audience: appleClientId(),
      issuer: 'https://appleid.apple.com',
    });
    const expectedNonce = createHash('sha256').update(rawNonce).digest('hex');
    if (payload.nonce !== expectedNonce) {
      throw new ReceiptlyError(401, 'LOGIN_NONCE_INVALID', 'The Apple sign-in nonce is invalid.');
    }
    if (typeof payload.sub !== 'string') throw new Error('Missing Apple subject.');
    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      displayName: null,
    };
  } catch (error) {
    if (error instanceof ReceiptlyError) throw error;
    throw new ReceiptlyError(401, 'PROVIDER_TOKEN_INVALID', 'The Apple sign-in credential is invalid.');
  }
};

const appleClientSecret = async () => {
  const teamId = process.env.RECEIPTLY_APPLE_TEAM_ID;
  const keyId = process.env.RECEIPTLY_APPLE_KEY_ID;
  const privateKey = process.env.RECEIPTLY_APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!teamId || !keyId || !privateKey) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Apple token exchange is not configured.');
  }
  const key = await importPKCS8(privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setAudience('https://appleid.apple.com')
    .setSubject(appleClientId())
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
};

/** 使用 Apple 授权码换取仅由服务端保存的 Refresh Token。 */
export const exchangeAppleAuthorizationCode = async (authorizationCode: string) => {
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appleClientId(),
      client_secret: await appleClientSecret(),
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  const payload = await response.json() as { refresh_token?: string; error?: string };
  if (!response.ok || !payload.refresh_token) {
    throw new ReceiptlyError(401, 'PROVIDER_TOKEN_INVALID', 'The Apple authorization code is invalid.');
  }
  return payload.refresh_token;
};

/** 在删除账号时调用 Apple 撤销接口，终止 Receiptly 的第三方授权。 */
export const revokeAppleToken = async (refreshToken: string) => {
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appleClientId(),
      client_secret: await appleClientSecret(),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!response.ok) throw new ReceiptlyError(503, 'INTERNAL_ERROR', 'Apple authorization could not be revoked.');
};
