import { dataResponse } from '@/receiptly-api/contracts/errors';

export function GET() {
  return dataResponse({ status: 'ok' });
}
