import { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';
import { getReceiptlyDb, householdMembers, households } from '@/receiptly-api/infrastructure/database/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const db = getReceiptlyDb();
    const memberships = await db
      .select({
        householdId: households.id,
        householdName: households.name,
        timezone: households.timezone,
        role: householdMembers.role,
      })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(and(
        eq(householdMembers.userId, actor.userId),
        eq(householdMembers.status, 'active'),
        isNull(households.deletedAt),
      ));
    return dataResponse({ user: actor, households: memberships });
  } catch (error) {
    return errorResponse(error);
  }
}
