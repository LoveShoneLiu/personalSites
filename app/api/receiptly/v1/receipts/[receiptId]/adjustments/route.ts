/** 文件职责：为可编辑小票添加折扣、退款、税费等金额调整项。 */
import { NextRequest } from 'next/server';
import { addReceiptAdjustment } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import {
  optionalString, readObject, requiredInteger, requiredString,
} from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';
const TYPES = new Set(['discount', 'refund', 'tax', 'non_item_fee', 'other']);
type Context = { params: Promise<{ receiptId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { receiptId } = await context.params;
    const body = readObject(await request.json());
    const type = requiredString(body.type, 'type', 24);
    if (!TYPES.has(type)) throw new Error('Invalid adjustment type.');
    return dataResponse(await addReceiptAdjustment(actor, receiptId, {
      type: type as 'discount' | 'refund' | 'tax' | 'non_item_fee' | 'other',
      amountCents: requiredInteger(body.amountCents, 'amountCents', -100000000),
      note: optionalString(body.note, 'note', 500),
    }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
