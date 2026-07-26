/** 文件职责：为 Google 或 Apple 登录签发一次性的 state 与 nonce 挑战。 */
import { NextRequest } from 'next/server';
import { createLoginChallenge } from '@/receiptly-api/application/auth';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    const provider = requiredString(body.provider, 'provider', 16);
    if (provider !== 'google' && provider !== 'apple') {
      throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'provider must be google or apple.');
    }
    return dataResponse(await createLoginChallenge(provider), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
