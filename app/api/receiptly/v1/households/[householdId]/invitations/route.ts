/** 文件职责：允许家庭 Owner 通过邮箱创建一次性家庭邀请。 */
import { NextRequest } from 'next/server';
import { createHouseholdInvitation } from '@/receiptly-api/application/family';
import { requiredEmail, requiredUuid } from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readReceiptlyLocale } from '@/receiptly-api/contracts/locale';
import { readObject } from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    const body = readObject(await request.json());
    const result = await createHouseholdInvitation(
      actor,
      requiredUuid(householdId, 'householdId'),
      requiredEmail(body.email),
      readReceiptlyLocale(body.locale, 'en-NZ'),
    );
    return dataResponse(result, 201, '邀请邮件已发送。');
  } catch (error) {
    return errorResponse(error);
  }
}
