import { NextRequest } from 'next/server';
import {
  and, eq, gt, isNull,
} from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import {
  getReceiptlyDb,
  householdMembers,
  receiptlySessions,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { verifyAccessToken } from './tokens';

export type ReceiptlyActor = {
  userId: string;
  sessionId: string;
  email: string | null;
  displayName: string | null;
};

export const requireActor = async (request: NextRequest): Promise<ReceiptlyActor> => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ReceiptlyError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }
  const { sub, sid } = await verifyAccessToken(authorization.slice(7));
  const db = getReceiptlyDb();
  const result = await db
    .select({
      id: receiptlyUsers.id,
      email: receiptlyUsers.email,
      displayName: receiptlyUsers.displayName,
      sessionId: receiptlySessions.id,
    })
    .from(receiptlyUsers)
    .innerJoin(receiptlySessions, eq(receiptlySessions.userId, receiptlyUsers.id))
    .where(and(
      eq(receiptlyUsers.id, sub),
      eq(receiptlyUsers.status, 'active'),
      isNull(receiptlyUsers.disabledAt),
      isNull(receiptlyUsers.deletedAt),
      eq(receiptlySessions.id, sid),
      isNull(receiptlySessions.revokedAt),
      gt(receiptlySessions.expiresAt, new Date()),
    ))
    .limit(1);
  const user = result[0];
  if (!user) throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Authentication is invalid.');
  return {
    userId: user.id,
    sessionId: user.sessionId,
    email: user.email,
    displayName: user.displayName,
  };
};

export const requireMembership = async (actor: ReceiptlyActor, householdId: string, ownerOnly = false) => {
  const db = getReceiptlyDb();
  const result = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.householdId, householdId),
      eq(householdMembers.userId, actor.userId),
      eq(householdMembers.status, 'active'),
    ))
    .limit(1);
  const membership = result[0];
  if (!membership) throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
  if (ownerOnly && membership.role !== 'owner') {
    throw new ReceiptlyError(403, 'FORBIDDEN', 'Owner access is required.');
  }
  return membership;
};

export const requireSingleHousehold = async (actor: ReceiptlyActor) => {
  const result = await getReceiptlyDb()
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.userId, actor.userId),
      eq(householdMembers.status, 'active'),
    ))
    .limit(2);
  if (result.length === 0) {
    throw new ReceiptlyError(409, 'HOUSEHOLD_REQUIRED', '请先创建或加入家庭。');
  }
  if (result.length > 1) {
    throw new ReceiptlyError(409, 'VERSION_CONFLICT', '请求必须指定家庭。');
  }
  return result[0].householdId;
};
