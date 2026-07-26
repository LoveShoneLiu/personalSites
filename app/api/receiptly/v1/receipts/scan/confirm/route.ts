/** 文件职责：将用户审核后的非持久化扫描候选数据一次性确认入账。 */
import { NextRequest } from 'next/server';
import { confirmScannedCandidate } from '@/receiptly-api/application/receipts';
import { readScannedCandidate } from '@/receiptly-api/contracts/candidate-payload';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { readObject } from '@/receiptly-api/contracts/validation';
import { requireActor, requireSingleHousehold } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

const readScanId = (value: unknown) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'receipt.id from the scan response must be a UUID.');
  }
  return value;
};

/**
 * 接收 `POST /receipts/scan` 返回并经用户审核的 `data.receipt` 与 `data.lines`。
 * 服务端根据认证身份解析用户唯一的有效家庭。
 */
export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    const receipt = readObject(body.receipt);
    const actor = await requireActor(request);
    const householdId = await requireSingleHousehold(actor);
    const result = await confirmScannedCandidate(
      actor,
      householdId,
      readScanId(receipt.id),
      readScannedCandidate({ receipt, lines: body.lines }),
    );
    return dataResponse({ householdId, ...result.detail }, result.created ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
