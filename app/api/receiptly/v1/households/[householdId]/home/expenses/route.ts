import { NextRequest } from 'next/server';
import { listHomeExpenses } from '@/receiptly-api/application/home-expenses';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string }> };

const optionalQuery = (value: string | null, field: string, maxLength: number) => {
  if (!value) return undefined;
  if (value.length > maxLength) throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} is too long.`);
  return value;
};

const optionalDateQuery = (value: string | null, field: string) => {
  const date = optionalQuery(value, field, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must use YYYY-MM-DD.`);
  }
  return date;
};

const readLimit = (value: string | null) => {
  if (!value) return 20;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'limit must be an integer from 1 to 100.');
  }
  return limit;
};

/** Returns confirmed line items only; drafts and needs_review receipts are never included. */
export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    const query = request.nextUrl.searchParams;
    const start = optionalDateQuery(query.get('start'), 'start');
    const end = optionalDateQuery(query.get('end'), 'end');
    if (start && end && start > end) {
      throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'start must not be after end.');
    }
    return dataResponse(await listHomeExpenses(actor, householdId, {
      start,
      end,
      store: optionalQuery(query.get('store'), 'store', 160),
      product: optionalQuery(query.get('product'), 'product', 300),
      receiptNumber: optionalQuery(query.get('receiptNumber'), 'receiptNumber', 160),
      cursor: optionalQuery(query.get('cursor'), 'cursor', 500),
      limit: readLimit(query.get('limit')),
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
