import { NextRequest } from 'next/server';
import { deleteCurrentAccount, getCurrentAccount } from '@/receiptly-api/application/account';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    return dataResponse(await getCurrentAccount(actor));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    return dataResponse(await deleteCurrentAccount(actor));
  } catch (error) {
    return errorResponse(error);
  }
}
