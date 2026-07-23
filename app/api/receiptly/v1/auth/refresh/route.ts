import { NextRequest } from 'next/server';
import { refresh } from '@/receiptly-api/application/auth';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    return dataResponse(await refresh(requiredString(body.refreshToken, 'refreshToken', 512)));
  } catch (error) {
    return errorResponse(error);
  }
}
