/** 文件职责：提供不依赖外部资源的服务存活检查。 */
import { dataResponse } from '@/receiptly-api/contracts/errors';

export function GET() {
  return dataResponse({ status: 'ok' });
}
