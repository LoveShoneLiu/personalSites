import {
  dataResponse,
  errorResponse,
  ReceiptlyError,
} from '@/receiptly-api/contracts/errors';
import { getMockReceiptlySession } from '@/receiptly-api/infrastructure/auth/mock-session';

export const runtime = 'nodejs';

/** Temporary development login. Remove this route when real mobile authentication is enabled. */
export async function GET() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
    }
    const session = await getMockReceiptlySession();
    return dataResponse({ user: session.actor, household: session.household });
  } catch (error) {
    return errorResponse(error);
  }
}
