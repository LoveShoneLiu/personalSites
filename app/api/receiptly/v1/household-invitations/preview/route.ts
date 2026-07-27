/** 文件职责：让已登录用户在同意前预览邀请码对应的家庭。 */
import { NextRequest } from 'next/server';
import { previewHouseholdInvitation } from '@/receiptly-api/application/family';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const body = readObject(await request.json());
    const result = await previewHouseholdInvitation(
      actor,
      requiredString(body.code, 'code', 8),
    );
    return dataResponse(result, 200, '邀请有效。');
  } catch (error) {
    return errorResponse(error);
  }
}
