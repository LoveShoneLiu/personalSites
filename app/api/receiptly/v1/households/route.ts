/** 文件职责：为当前认证用户创建其首个家庭及 Owner 成员关系。 */
import { NextRequest } from 'next/server';
import { createHouseholdForUser } from '@/receiptly-api/application/account';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const body = readObject(await request.json());
    const timezone = body.timezone === undefined
      ? 'Pacific/Auckland'
      : requiredString(body.timezone, 'timezone', 64);
    try {
      new Intl.DateTimeFormat('en-NZ', { timeZone: timezone }).format();
    } catch {
      throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'timezone must be a valid IANA timezone.');
    }
    const currency = body.currency === undefined ? 'NZD' : requiredString(body.currency, 'currency', 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'currency must be an ISO 4217 code.');
    }
    return dataResponse(await createHouseholdForUser(actor, {
      name: requiredString(body.name, 'name', 120),
      timezone,
      currency,
    }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
