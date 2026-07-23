import { NextRequest } from 'next/server';
import { deleteReceipt, getReceipt } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ receiptId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { receiptId } = await context.params;
    return dataResponse(await getReceipt(actor, receiptId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { receiptId } = await context.params;
    return dataResponse(await deleteReceipt(actor, receiptId));
  } catch (error) {
    return errorResponse(error);
  }
}
