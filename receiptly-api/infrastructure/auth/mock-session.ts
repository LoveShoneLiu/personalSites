import {
  getReceiptlyDb,
  householdMembers,
  households,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { ReceiptlyActor } from './guard';

// Temporary development identity. It is deliberately isolated from the real token flow.
const mockUserId = '00000000-0000-4000-8000-000000000001';
const mockHouseholdId = '00000000-0000-4000-8000-000000000002';

const mockActor: ReceiptlyActor = {
  userId: mockUserId,
  sessionId: '00000000-0000-4000-8000-000000000003',
  email: 'receiptly-demo@local.invalid',
  displayName: 'Receiptly Demo User',
};

export const getMockReceiptlySession = async () => {
  const db = getReceiptlyDb();
  await db.transaction(async (tx) => {
    await tx.insert(receiptlyUsers).values({
      id: mockUserId,
      email: mockActor.email,
      passwordHash: 'mock-auth-is-not-enabled',
      displayName: mockActor.displayName,
    }).onConflictDoNothing();
    await tx.insert(households).values({
      id: mockHouseholdId,
      name: 'Receiptly Demo Household',
      ownerUserId: mockUserId,
    }).onConflictDoNothing();
    await tx.insert(householdMembers).values({
      householdId: mockHouseholdId,
      userId: mockUserId,
      role: 'owner',
    }).onConflictDoNothing();
  });

  return {
    actor: mockActor,
    household: {
      id: mockHouseholdId,
      name: 'Receiptly Demo Household',
      role: 'owner' as const,
    },
  };
};
