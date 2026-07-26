/** 文件职责：为本地开发创建固定 Mock 用户、家庭及成员关系。 */
import {
  getReceiptlyDb,
  householdMembers,
  households,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { ReceiptlyActor } from './guard';

// 仅用于本地开发的固定身份，必须与真实 Token 流程完全隔离。
const mockUserId = '00000000-0000-4000-8000-000000000001';
const mockHouseholdId = '00000000-0000-4000-8000-000000000002';

const mockActor: ReceiptlyActor = {
  userId: mockUserId,
  sessionId: '00000000-0000-4000-8000-000000000003',
  email: 'receiptly-demo@local.invalid',
  displayName: 'Receiptly Demo User',
};

/** 幂等创建并返回本地开发专用的 Mock 用户和家庭。 */
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
