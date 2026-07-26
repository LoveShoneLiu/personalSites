/** 文件职责：保留旧版认证引导入口，并提示客户端改用正式认证接口。 */
import { errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';

export const runtime = 'nodejs';

export async function POST() {
  return errorResponse(new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.'));
}
