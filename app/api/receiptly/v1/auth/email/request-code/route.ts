/** 文件职责：申请邮箱验证码，并触发 Resend 邮件发送。 */
import { NextRequest } from 'next/server';
import { requestEmailCode } from '@/receiptly-api/application/auth';
import { requiredEmail } from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    return dataResponse(await requestEmailCode(
      requiredEmail(body.email),
      body.locale === undefined ? 'en-NZ' : requiredString(body.locale, 'locale', 16),
    ), 202);
  } catch (error) {
    return errorResponse(error);
  }
}
