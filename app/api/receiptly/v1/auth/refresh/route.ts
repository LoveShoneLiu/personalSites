/** 文件职责：轮换 Refresh Token 并签发新的会话凭据。 */
import { NextRequest } from 'next/server';
import { refreshSession } from '@/receiptly-api/application/auth';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requiredUuid } from '@/receiptly-api/contracts/auth-payload';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    return dataResponse(await refreshSession(
      requiredString(body.refreshToken, 'refreshToken', 512),
      requiredUuid(body.installationId, 'installationId'),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
