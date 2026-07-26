import { NextRequest } from 'next/server';
import { logoutSession } from '@/receiptly-api/application/auth';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    await logoutSession(actor.sessionId);
    return dataResponse({ loggedOut: true });
  } catch (error) {
    return errorResponse(error);
  }
}
