import {
  and, count, eq, inArray, isNull, ne,
} from 'drizzle-orm';
import { ReceiptlyActor } from '@/receiptly-api/infrastructure/auth/guard';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import {
  getReceiptlyDb,
  householdMembers,
  households,
  receiptlyAuthIdentities,
  receiptlyProviderCredentials,
  receiptlySessions,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { decryptProviderToken } from '@/receiptly-api/infrastructure/auth/provider-credentials';
import { revokeAppleToken } from '@/receiptly-api/infrastructure/auth/providers';

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
    throw new ReceiptlyError(409, 'VERSION_CONFLICT', '当前MVP每个用户只能加入一个家庭。');
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
    throw new ReceiptlyError(
      409,
      'OWNER_TRANSFER_REQUIRED',
      '请先将家庭Owner转让给其他成员，再删除账号。',
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
