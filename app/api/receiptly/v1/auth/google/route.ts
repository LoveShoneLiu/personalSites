/** 文件职责：接收并校验 Google ID Token，返回统一的 Receiptly 会话。 */
import { NextRequest } from 'next/server';
import { loginWithGoogle } from '@/receiptly-api/application/auth';
import { readAuthDevice, requiredUuid } from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    return dataResponse(await loginWithGoogle({
      attemptId: requiredUuid(body.attemptId, 'attemptId'),
      state: requiredString(body.state, 'state', 512),
      idToken: requiredString(body.idToken, 'idToken', 8192),
      device: readAuthDevice(body.device),
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
