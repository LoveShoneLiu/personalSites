/** 文件职责：返回指定家庭当前有效成员列表。 */
import { NextRequest } from 'next/server';
import { listHouseholdMembers } from '@/receiptly-api/application/family';
import { requiredUuid } from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    return dataResponse(await listHouseholdMembers(
      actor,
      requiredUuid(householdId, 'householdId'),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
