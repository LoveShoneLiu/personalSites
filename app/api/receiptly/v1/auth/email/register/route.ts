import { NextRequest } from 'next/server';
import { registerWithEmailPassword } from '@/receiptly-api/application/auth';
import {
  nullableProfileString,
  readAuthDevice,
  requiredEmail,
  requiredPassword,
} from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    const code = requiredString(body.code, 'code', 6);
    if (!/^\d{6}$/.test(code)) {
      throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'code must contain 6 digits.');
    }
    return dataResponse(await registerWithEmailPassword({
      email: requiredEmail(body.email),
      password: requiredPassword(body.password),
      code,
      displayName: nullableProfileString(body.displayName, 'displayName', 120),
      device: readAuthDevice(body.device),
    }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
