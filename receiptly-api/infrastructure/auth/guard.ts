import { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { getReceiptlyDb, householdMembers, receiptlyUsers } from '@/receiptly-api/infrastructure/database/client';
import { verifyAccessToken } from './tokens';

export type ReceiptlyActor = {
  userId: string;
  email: string;
  displayName: string;
};

export const requireActor = async (request: NextRequest): Promise<ReceiptlyActor> => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ReceiptlyError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }
  const { sub } = verifyAccessToken(authorization.slice(7));
  const db = getReceiptlyDb();
  const result = await db
    .select({ id: receiptlyUsers.id, email: receiptlyUsers.email, displayName: receiptlyUsers.displayName })
    .from(receiptlyUsers)
    .where(and(eq(receiptlyUsers.id, sub), isNull(receiptlyUsers.disabledAt)))
    .limit(1);
  const user = result[0];
  if (!user) throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Authentication is invalid.');
  return { userId: user.id, email: user.email, displayName: user.displayName };
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
