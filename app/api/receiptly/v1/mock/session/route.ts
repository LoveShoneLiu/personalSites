/** 文件职责：仅在开发环境提供固定 Mock 用户与家庭上下文。 */
import {
  dataResponse,
  errorResponse,
  ReceiptlyError,
} from '@/receiptly-api/contracts/errors';
import { getMockReceiptlySession } from '@/receiptly-api/infrastructure/auth/mock-session';

export const runtime = 'nodejs';

/** 仅用于本地开发的临时登录入口；启用真实移动端认证后应删除。 */
export async function GET() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
    }
    const session = await getMockReceiptlySession();
    return dataResponse({ user: session.actor, household: session.household });
  } catch (error) {
    return errorResponse(error);
  }
}
