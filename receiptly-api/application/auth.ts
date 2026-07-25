import bcrypt from 'bcryptjs';
import {
  and, eq, gt, isNull,
} from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import {
  getReceiptlyDb,
  householdMembers,
  households,
  receiptlySessions,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { createAccessToken, createRefreshToken, hashToken } from '@/receiptly-api/infrastructure/auth/tokens';

const tokenPair = async (userId: string) => {
  const refreshToken = createRefreshToken();
  const db = getReceiptlyDb();
  await db.insert(receiptlySessions).values({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });
  return { accessToken: createAccessToken(userId), refreshToken, expiresIn: 900 };
};

export const bootstrapOwner = async (input: {
  bootstrapToken: string;
  email: string;
  password: string;
  displayName: string;
  householdName: string;
}) => {
  if (!process.env.RECEIPTLY_BOOTSTRAP_TOKEN || input.bootstrapToken !== process.env.RECEIPTLY_BOOTSTRAP_TOKEN) {
    throw new ReceiptlyError(403, 'FORBIDDEN', 'Bootstrap token is invalid.');
  }
  if (input.password.length < 12) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'Password must contain at least 12 characters.');
  }
  const db = getReceiptlyDb();
  const existing = await db.select({ id: receiptlyUsers.id }).from(receiptlyUsers).limit(1);
  if (existing.length > 0) throw new ReceiptlyError(409, 'VERSION_CONFLICT', 'Receiptly bootstrap has already completed.');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.insert(receiptlyUsers).values({
      email: input.email.toLowerCase(), passwordHash, displayName: input.displayName,
    }).returning();
    const [household] = await tx.insert(households).values({
      name: input.householdName, ownerUserId: user.id,
    }).returning();
    await tx.insert(householdMembers).values({ householdId: household.id, userId: user.id, role: 'owner' });
    return { user, household };
  });
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
    },
    household: result.household,
    tokens: await tokenPair(result.user.id),
  };
};

export const login = async (email: string, password: string) => {
  const db = getReceiptlyDb();
  const result = await db.select().from(receiptlyUsers).where(and(
    eq(receiptlyUsers.email, email.toLowerCase()),
    isNull(receiptlyUsers.disabledAt),
  )).limit(1);
  const user = result[0];
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Email or password is invalid.');
  }
  return { user: { id: user.id, email: user.email, displayName: user.displayName }, tokens: await tokenPair(user.id) };
};

export const refresh = async (refreshToken: string) => {
  const db = getReceiptlyDb();
  const result = await db.select().from(receiptlySessions).where(and(
    eq(receiptlySessions.refreshTokenHash, hashToken(refreshToken)),
    isNull(receiptlySessions.revokedAt),
    gt(receiptlySessions.expiresAt, new Date()),
  )).limit(1);
  const session = result[0];
  if (!session) throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Refresh token is invalid.');
  await db.update(receiptlySessions).set({ revokedAt: new Date() }).where(eq(receiptlySessions.id, session.id));
  return tokenPair(session.userId);
};

export const logout = async (refreshToken: string) => {
  const db = getReceiptlyDb();
  await db.update(receiptlySessions).set({ revokedAt: new Date() }).where(eq(
    receiptlySessions.refreshTokenHash,
    hashToken(refreshToken),
  ));
};
