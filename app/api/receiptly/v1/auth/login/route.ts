/** 文件职责：为已废弃的通用登录入口返回稳定迁移提示。 */
import { errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';

export const runtime = 'nodejs';

export async function POST() {
  return errorResponse(new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.'));
}
