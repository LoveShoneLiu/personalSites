import { NextRequest } from 'next/server';
import { addReceiptLine } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import {
  optionalString, readObject, requiredInteger, requiredString,
} from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ receiptId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { receiptId } = await context.params;
    const body = readObject(await request.json());
    const status = body.status === undefined ? 'included' : requiredString(body.status, 'status', 20);
    if (status !== 'included' && status !== 'excluded') throw new Error('Invalid line status.');
    const line = await addReceiptLine(actor, receiptId, {
      displayName: requiredString(body.displayName, 'displayName', 300),
      lineCents: requiredInteger(body.lineCents, 'lineCents'),
      rawText: optionalString(body.rawText, 'rawText', 500),
      quantity: optionalString(body.quantity, 'quantity', 24) ?? '1',
      packValue: optionalString(body.packValue, 'packValue', 24),
      packUnit: optionalString(body.packUnit, 'packUnit', 12),
      promotion: optionalString(body.promotion, 'promotion', 40) ?? 'none',
      status,
    });
    return dataResponse(line, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
