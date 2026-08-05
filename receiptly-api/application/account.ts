/** 文件职责：实现当前账号查询、家庭创建及满足合规约束的账号删除用例。 */
import {
  and, count, eq, inArray, isNull, ne,
} from 'drizzle-orm';
import { ReceiptlyActor } from '@/receiptly-api/infrastructure/auth/guard';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import {
  getReceiptlyDb,
  householdInvitations,
  householdMembers,
  households,
  receiptlyAuthIdentities,
  receiptlyEmailLoginCodes,
  receiptlyProviderCredentials,
  receiptlySessions,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { decryptProviderToken } from '@/receiptly-api/infrastructure/auth/provider-credentials';
import { revokeAppleToken } from '@/receiptly-api/infrastructure/auth/providers';

/** 返回当前用户、家庭列表、活动家庭及 Onboarding 状态。 */
export const getCurrentAccount = async (actor: ReceiptlyActor) => {
  const db = getReceiptlyDb();
  const userHouseholds = await db.select({
    id: households.id,
    name: households.name,
    role: householdMembers.role,
    timezone: households.timezone,
    currency: households.currency,
  }).from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(and(
      eq(householdMembers.userId, actor.userId),
      eq(householdMembers.status, 'active'),
      isNull(households.deletedAt),
    ));
  const activeHouseholdId = userHouseholds.length === 1 ? userHouseholds[0].id : null;
  let onboardingState: 'needs_profile' | 'needs_household' | 'ready' = 'ready';
  if (!actor.displayName) onboardingState = 'needs_profile';
  else if (userHouseholds.length === 0) onboardingState = 'needs_household';
  return {
    user: {
      id: actor.userId,
      email: actor.email,
      displayName: actor.displayName,
    },
    households: userHouseholds,
    activeHouseholdId,
    onboardingState,
  };
};

/**
 * 在同一事务中创建家庭及其 Owner 成员关系。
 * Owner 必须来自服务端认证身份，不能信任客户端提交的用户信息。
 */
export const createHouseholdForUser = async (
  actor: ReceiptlyActor,
  input: { name: string; timezone: string; currency: string },
) => {
  const db = getReceiptlyDb();
  const existing = await db.select({ id: householdMembers.id }).from(householdMembers).where(and(
    eq(householdMembers.userId, actor.userId),
    eq(householdMembers.status, 'active'),
  )).limit(1);
  if (existing.length > 0) {
    throw new ReceiptlyError(409, 'USER_ALREADY_HAS_HOUSEHOLD', 'Each user can belong to only one household.');
  }
  const household = await db.transaction(async (tx) => {
    const [created] = await tx.insert(households).values({
      name: input.name,
      timezone: input.timezone,
      currency: input.currency,
      ownerUserId: actor.userId,
    }).returning();
    await tx.insert(householdMembers).values({
      householdId: created.id,
      userId: actor.userId,
      role: 'owner',
    });
    return created;
  });
  return {
    household: {
      id: household.id,
      name: household.name,
      role: 'owner' as const,
      timezone: household.timezone,
      currency: household.currency,
    },
    activeHouseholdId: household.id,
    onboardingState: 'ready' as const,
  };
};

/**
 * 删除当前账号。
 * 有其他成员的 Owner 必须先转移所有权；单人家庭随账号一起删除。
 */
export const deleteCurrentAccount = async (actor: ReceiptlyActor) => {
  const db = getReceiptlyDb();
  const owned = await db.select({ id: households.id }).from(households).where(and(
    eq(households.ownerUserId, actor.userId),
    isNull(households.deletedAt),
  ));
  const householdMemberCounts = await Promise.all(owned.map(async (household) => {
    const [result] = await db.select({ count: count() }).from(householdMembers).where(and(
      eq(householdMembers.householdId, household.id),
      eq(householdMembers.status, 'active'),
      ne(householdMembers.userId, actor.userId),
    ));
    return { householdId: household.id, count: result.count };
  }));
  const blockedHousehold = householdMemberCounts.find(({ count: memberCount }) => memberCount > 0);
  if (blockedHousehold) {
    // 账号删除不能让家庭失去 Owner，也不能由服务端隐式选择继任者；
    // 所有权转移必须由独立的、经过认证的流程完成。
    throw new ReceiptlyError(
      409,
      'OWNER_TRANSFER_REQUIRED',
      'Remove the other household members before deleting your account.',
      { householdId: blockedHousehold.householdId },
    );
  }

  const appleCredentials = await db.select({
    encryptedRefreshToken: receiptlyProviderCredentials.encryptedRefreshToken,
  }).from(receiptlyProviderCredentials)
    .innerJoin(
      receiptlyAuthIdentities,
      eq(receiptlyProviderCredentials.identityId, receiptlyAuthIdentities.id),
    )
    .where(and(
      eq(receiptlyAuthIdentities.userId, actor.userId),
      eq(receiptlyAuthIdentities.provider, 'apple'),
      isNull(receiptlyAuthIdentities.revokedAt),
    ));
  await Promise.all(appleCredentials.map((credential) => revokeAppleToken(
    decryptProviderToken(credential.encryptedRefreshToken),
  )));

  // 删除单人家庭、撤销全部会话和匿名化账号必须作为一个数据库事务完成，
  // 避免部分删除后仍残留有效访问权限。
  await db.transaction(async (tx) => {
    const ownedHouseholdIds = owned.map(({ id }) => id);
    if (ownedHouseholdIds.length > 0) {
      await tx.delete(households).where(inArray(households.id, ownedHouseholdIds));
    }
    await tx.update(householdMembers).set({ status: 'removed' }).where(
      eq(householdMembers.userId, actor.userId),
    );
    await tx.update(receiptlySessions).set({
      revokedAt: new Date(),
      revokeReason: 'account_deleted',
    }).where(eq(receiptlySessions.userId, actor.userId));
    if (actor.email) {
      // 邮箱验证码与未处理邀请也包含直接身份信息，账号删除时一并清理。
      await tx.delete(receiptlyEmailLoginCodes).where(eq(
        receiptlyEmailLoginCodes.email,
        actor.email.toLowerCase(),
      ));
      await tx.delete(householdInvitations).where(eq(
        householdInvitations.invitedEmail,
        actor.email.toLowerCase(),
      ));
    }
    await tx.delete(receiptlyAuthIdentities).where(eq(
      receiptlyAuthIdentities.userId,
      actor.userId,
    ));
    await tx.update(receiptlyUsers).set({
      email: null,
      displayName: null,
      passwordHash: null,
      status: 'deleted',
      disabledAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(receiptlyUsers.id, actor.userId));
  });
  return { deleted: true };
};
