import { errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';

export const runtime = 'nodejs';

export async function POST() {
  return errorResponse(new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.'));
}
