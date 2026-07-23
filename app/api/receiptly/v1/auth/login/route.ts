import { NextRequest } from 'next/server';
import { login } from '@/receiptly-api/application/auth';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    return dataResponse(await login(
      requiredString(body.email, 'email', 320),
      requiredString(body.password, 'password', 512),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
