/** 文件职责：计算小票商品、调整项与声明总额之间的核对结果。 */
import { NextRequest } from 'next/server';
import { reconciliation } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';
type Context = { params: Promise<{ receiptId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { receiptId } = await context.params;
    return dataResponse(await reconciliation(actor, receiptId));
  } catch (error) {
    return errorResponse(error);
  }
}
