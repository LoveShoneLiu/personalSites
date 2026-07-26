/** 文件职责：提供指定家庭的小票列表查询与手动草稿创建接口。 */
import { NextRequest } from 'next/server';
import { createReceipt, listReceipts } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import {
  optionalString, readObject, requiredInteger, requiredIsoDate,
} from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    return dataResponse(await listReceipts(actor, householdId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    const body = readObject(await request.json());
    const receipt = await createReceipt(actor, householdId, {
      storeName: optionalString(body.storeName, 'storeName', 160),
      purchasedOn: requiredIsoDate(body.purchasedOn, 'purchasedOn'),
      totalCents: requiredInteger(body.totalCents, 'totalCents'),
      currency: optionalString(body.currency, 'currency', 3) ?? 'NZD',
    });
    return dataResponse(receipt, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
