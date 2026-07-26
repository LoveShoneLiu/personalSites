/** 文件职责：验证一次性邮箱验证码，并创建或登录兼容账号。 */
import { NextRequest } from 'next/server';
import { verifyEmailCode } from '@/receiptly-api/application/auth';
import { readAuthDevice, requiredEmail } from '@/receiptly-api/contracts/auth-payload';
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
    return dataResponse(await verifyEmailCode(
      requiredEmail(body.email),
      code,
      readAuthDevice(body.device),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
