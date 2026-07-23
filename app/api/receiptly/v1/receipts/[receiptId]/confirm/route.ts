import { NextRequest } from 'next/server';
import { confirmReceipt } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredInteger } from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';
type Context = { params: Promise<{ receiptId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { receiptId } = await context.params;
    const body = readObject(await request.json());
    return dataResponse(await confirmReceipt(actor, receiptId, requiredInteger(body.expectedVersion, 'expectedVersion', 1)));
  } catch (error) {
    return errorResponse(error);
  }
}
