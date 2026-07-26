import { NextRequest } from 'next/server';
import { loginWithEmailPassword } from '@/receiptly-api/application/auth';
import {
  readAuthDevice,
  requiredEmail,
  requiredPassword,
} from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    return dataResponse(await loginWithEmailPassword(
      requiredEmail(body.email),
      requiredPassword(body.password),
      readAuthDevice(body.device),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
