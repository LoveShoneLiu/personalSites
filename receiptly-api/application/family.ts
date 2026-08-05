/** 文件职责：实现家庭邀请、加入、成员列表及 Owner 删除成员的业务规则。 */
import { randomInt } from 'crypto';
import { Resend } from 'resend';
import {
  and, count, desc, eq, gte, isNull,
} from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { ReceiptlyLocale } from '@/receiptly-api/contracts/locale';
import { ReceiptlyActor, requireMembership } from '@/receiptly-api/infrastructure/auth/guard';
import { hashLoginSecret } from '@/receiptly-api/infrastructure/auth/tokens';
import {
  auditEvents,
  getReceiptlyDb,
  householdInvitationAttempts,
  householdInvitations,
  householdMembers,
  households,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';

const INVITATION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITATION_CODE_LENGTH = 8;
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const INVITATION_RESEND_DELAY_MS = 60 * 1000;
const INVITATION_MAX_SENDS_PER_HOUR = 5;
const INVITATION_MAX_LOOKUPS = 10;
const INVITATION_LOOKUP_WINDOW_MS = 15 * 60 * 1000;

const invitationCode = () => Array.from(
  { length: INVITATION_CODE_LENGTH },
  () => INVITATION_ALPHABET[randomInt(0, INVITATION_ALPHABET.length)],
).join('');

const normalizeCode = (value: string) => value.trim().toUpperCase();

const resendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Email delivery is not configured.');
  return new Resend(apiKey);
};

const recordLookup = async (userId: string, succeeded: boolean) => {
  await getReceiptlyDb().insert(householdInvitationAttempts).values({ userId, succeeded });
};

/** 限制单个认证账号批量枚举短邀请码。 */
const requireLookupQuota = async (userId: string) => {
  const since = new Date(Date.now() - INVITATION_LOOKUP_WINDOW_MS);
  const [result] = await getReceiptlyDb()
    .select({ count: count() })
    .from(householdInvitationAttempts)
    .where(and(
      eq(householdInvitationAttempts.userId, userId),
      gte(householdInvitationAttempts.createdAt, since),
    ));
  if (result.count >= INVITATION_MAX_LOOKUPS) {
    throw new ReceiptlyError(429, 'RATE_LIMITED', 'Too many invitation code lookups. Please try again later.', {
      retryAfter: INVITATION_LOOKUP_WINDOW_MS / 1000,
    });
  }
};

const loadInvitation = async (actor: ReceiptlyActor, rawCode: string) => {
  await requireLookupQuota(actor.userId);
  const code = normalizeCode(rawCode);
  if (
    code.length !== INVITATION_CODE_LENGTH
    || Array.from(code).some((character) => !INVITATION_ALPHABET.includes(character))
  ) {
    await recordLookup(actor.userId, false);
    throw new ReceiptlyError(404, 'INVITATION_NOT_FOUND', 'The invitation code was not found.');
  }
  const [invitation] = await getReceiptlyDb().select({
    id: householdInvitations.id,
    householdId: householdInvitations.householdId,
    householdName: households.name,
    householdTimezone: households.timezone,
    householdCurrency: households.currency,
    invitedEmail: householdInvitations.invitedEmail,
    expiresAt: householdInvitations.expiresAt,
    acceptedAt: householdInvitations.acceptedAt,
    revokedAt: householdInvitations.revokedAt,
  }).from(householdInvitations)
    .innerJoin(households, eq(householdInvitations.householdId, households.id))
    .where(and(
      eq(householdInvitations.codeHash, hashLoginSecret(code)),
      isNull(households.deletedAt),
    ))
    .limit(1);
  await recordLookup(actor.userId, Boolean(invitation));
  if (!invitation || invitation.revokedAt) {
    throw new ReceiptlyError(404, 'INVITATION_NOT_FOUND', 'The invitation code was not found.');
  }
  if (invitation.acceptedAt) {
    throw new ReceiptlyError(409, 'INVITATION_ALREADY_ACCEPTED', 'This invitation has already been accepted.');
  }
  if (invitation.expiresAt <= new Date()) {
    throw new ReceiptlyError(410, 'INVITATION_EXPIRED', 'This invitation has expired.');
  }
  return invitation;
};

/**
 * 创建一次性家庭邀请码并发送邮件。
 * 原始邀请码仅用于本次邮件发送，不写入数据库或日志。
 */
export const createHouseholdInvitation = async (
  actor: ReceiptlyActor,
  householdId: string,
  email: string,
  locale: ReceiptlyLocale,
) => {
  await requireMembership(actor, householdId, true);
  const from = process.env.RECEIPTLY_EMAIL_FROM;
  if (!from) throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Email sender is not configured.');
  if (actor.email === email) {
    throw new ReceiptlyError(409, 'ALREADY_A_MEMBER', 'You are already a member of this household.');
  }
  const db = getReceiptlyDb();
  const [existingMembership] = await db.select({
    householdId: householdMembers.householdId,
  })
    .from(receiptlyUsers)
    .innerJoin(householdMembers, eq(householdMembers.userId, receiptlyUsers.id))
    .where(and(
      eq(receiptlyUsers.email, email),
      eq(householdMembers.status, 'active'),
    ))
    .limit(1);
  if (existingMembership?.householdId === householdId) {
    throw new ReceiptlyError(409, 'ALREADY_A_MEMBER', 'This user is already a member of the household.');
  }
  if (existingMembership) {
    throw new ReceiptlyError(409, 'USER_ALREADY_HAS_HOUSEHOLD', 'This user already belongs to another household.');
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recentCount] = await db.select({ count: count() }).from(householdInvitations).where(and(
    eq(householdInvitations.invitedBy, actor.userId),
    gte(householdInvitations.createdAt, hourAgo),
  ));
  if (recentCount.count >= INVITATION_MAX_SENDS_PER_HOUR) {
    throw new ReceiptlyError(429, 'RATE_LIMITED', 'Too many invitations have been sent. Please try again later.', { retryAfter: 3600 });
  }
  const [latest] = await db.select({ createdAt: householdInvitations.createdAt })
    .from(householdInvitations)
    .where(and(
      eq(householdInvitations.householdId, householdId),
      eq(householdInvitations.invitedEmail, email),
    ))
    .orderBy(desc(householdInvitations.createdAt))
    .limit(1);
  if (latest && latest.createdAt.getTime() + INVITATION_RESEND_DELAY_MS > Date.now()) {
    throw new ReceiptlyError(429, 'RATE_LIMITED', 'Please wait before sending another invitation.', { retryAfter: 60 });
  }

  const code = invitationCode();
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
  const invitation = await db.transaction(async (tx) => {
    await tx.update(householdInvitations).set({ revokedAt: new Date() }).where(and(
      eq(householdInvitations.householdId, householdId),
      eq(householdInvitations.invitedEmail, email),
      isNull(householdInvitations.acceptedAt),
      isNull(householdInvitations.revokedAt),
    ));
    const [created] = await tx.insert(householdInvitations).values({
      householdId,
      invitedEmail: email,
      codeHash: hashLoginSecret(code),
      invitedBy: actor.userId,
      expiresAt,
    }).returning({ id: householdInvitations.id });
    return created;
  });

  try {
    const subject = locale === 'zh-CN'
      ? 'Receiptly 家庭邀请'
      : 'You are invited to join a Receiptly household';
    const message = locale === 'zh-CN'
      ? `你收到了 Receiptly 家庭邀请。邀请码是 ${code}，7 天内有效。请登录 App 后输入邀请码并确认加入。`
      : `You have been invited to join a Receiptly household. Your invitation code is ${code}. It expires in 7 days. Sign in to the app, enter the code, and confirm that you want to join.`;
    const { error } = await resendClient().emails.send({
      from,
      to: email,
      subject,
      text: message,
    });
    if (error) throw new Error(error.message);
  } catch {
    await db.update(householdInvitations).set({ revokedAt: new Date() }).where(
      eq(householdInvitations.id, invitation.id),
    );
    throw new ReceiptlyError(503, 'EMAIL_DELIVERY_FAILED', 'The invitation email could not be sent. Please try again later.');
  }
  return { invitationId: invitation.id, email, expiresAt };
};

/** 预览有效邀请，不创建成员关系。 */
export const previewHouseholdInvitation = async (actor: ReceiptlyActor, code: string) => {
  const invitation = await loadInvitation(actor, code);
  return {
    household: { id: invitation.householdId, name: invitation.householdName },
    invitedEmail: invitation.invitedEmail,
    expiresAt: invitation.expiresAt,
  };
};

/** 接受邀请，并以事务保证邀请码一次性使用及单家庭约束。 */
export const acceptHouseholdInvitation = async (actor: ReceiptlyActor, code: string) => {
  const invitation = await loadInvitation(actor, code);
  if (!actor.email || actor.email.trim().toLowerCase() !== invitation.invitedEmail) {
    throw new ReceiptlyError(403, 'INVITATION_EMAIL_MISMATCH', 'Please sign in with the email address that received the invitation.');
  }
  const db = getReceiptlyDb();
  const activeMemberships = await db.select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.userId, actor.userId),
      eq(householdMembers.status, 'active'),
    ))
    .limit(1);
  if (activeMemberships[0]?.householdId === invitation.householdId) {
    throw new ReceiptlyError(409, 'ALREADY_A_MEMBER', 'You are already a member of this household.');
  }
  if (activeMemberships.length > 0) {
    throw new ReceiptlyError(409, 'USER_ALREADY_HAS_HOUSEHOLD', 'Each user can belong to only one household.');
  }

  await db.transaction(async (tx) => {
    const accepted = await tx.update(householdInvitations).set({
      acceptedAt: new Date(),
      acceptedBy: actor.userId,
    }).where(and(
      eq(householdInvitations.id, invitation.id),
      isNull(householdInvitations.acceptedAt),
      isNull(householdInvitations.revokedAt),
    )).returning({ id: householdInvitations.id });
    if (accepted.length === 0) {
      throw new ReceiptlyError(409, 'INVITATION_ALREADY_ACCEPTED', 'This invitation has already been accepted.');
    }
    const [existing] = await tx.select({ id: householdMembers.id })
      .from(householdMembers)
      .where(and(
        eq(householdMembers.householdId, invitation.householdId),
        eq(householdMembers.userId, actor.userId),
      ))
      .limit(1);
    if (existing) {
      await tx.update(householdMembers).set({ role: 'member', status: 'active' }).where(
        eq(householdMembers.id, existing.id),
      );
    } else {
      await tx.insert(householdMembers).values({
        householdId: invitation.householdId,
        userId: actor.userId,
        role: 'member',
      });
    }
    await tx.insert(auditEvents).values({
      householdId: invitation.householdId,
      actorId: actor.userId,
      action: 'household.invitation.accepted',
      objectType: 'household_invitation',
      objectId: invitation.id,
      changeSummary: { invitedEmail: invitation.invitedEmail },
    });
  });
  return {
    household: {
      id: invitation.householdId,
      name: invitation.householdName,
      role: 'member' as const,
      timezone: invitation.householdTimezone,
      currency: invitation.householdCurrency,
    },
    activeHouseholdId: invitation.householdId,
    onboardingState: 'ready' as const,
  };
};

/** 返回家庭当前有效成员；普通成员也可以查看成员列表。 */
export const listHouseholdMembers = async (actor: ReceiptlyActor, householdId: string) => {
  await requireMembership(actor, householdId);
  const members = await getReceiptlyDb().select({
    userId: householdMembers.userId,
    displayName: receiptlyUsers.displayName,
    email: receiptlyUsers.email,
    role: householdMembers.role,
    joinedAt: householdMembers.createdAt,
  }).from(householdMembers)
    .innerJoin(receiptlyUsers, eq(householdMembers.userId, receiptlyUsers.id))
    .where(and(
      eq(householdMembers.householdId, householdId),
      eq(householdMembers.status, 'active'),
    ))
    .orderBy(desc(householdMembers.role), householdMembers.createdAt);
  return { members };
};

/** Owner 软删除普通成员，保留成员过去创建的家庭小票。 */
export const removeHouseholdMember = async (
  actor: ReceiptlyActor,
  householdId: string,
  userId: string,
) => {
  await requireMembership(actor, householdId, true);
  const db = getReceiptlyDb();
  const [member] = await db.select({
    id: householdMembers.id,
    role: householdMembers.role,
  }).from(householdMembers).where(and(
    eq(householdMembers.householdId, householdId),
    eq(householdMembers.userId, userId),
    eq(householdMembers.status, 'active'),
  )).limit(1);
  if (!member) throw new ReceiptlyError(404, 'MEMBER_NOT_FOUND', 'The household member was not found.');
  if (member.role === 'owner' || userId === actor.userId) {
    throw new ReceiptlyError(409, 'CANNOT_REMOVE_OWNER', 'The household owner cannot be removed.');
  }
  await db.transaction(async (tx) => {
    await tx.update(householdMembers).set({ status: 'removed' }).where(
      eq(householdMembers.id, member.id),
    );
    await tx.insert(auditEvents).values({
      householdId,
      actorId: actor.userId,
      action: 'household.member.removed',
      objectType: 'user',
      objectId: userId,
      changeSummary: { removedBy: actor.userId },
    });
  });
  return { removed: true, userId };
};
