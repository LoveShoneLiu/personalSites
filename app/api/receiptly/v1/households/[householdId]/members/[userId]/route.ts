/** 文件职责：允许家庭 Owner 软删除指定普通成员。 */
import { NextRequest } from 'next/server';
import { removeHouseholdMember } from '@/receiptly-api/application/family';
import { requiredUuid } from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string; userId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId, userId } = await context.params;
    return dataResponse(await removeHouseholdMember(
      actor,
      requiredUuid(householdId, 'householdId'),
      requiredUuid(userId, 'userId'),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
