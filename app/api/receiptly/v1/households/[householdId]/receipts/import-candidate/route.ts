/** 文件职责：将 App 审核中的扫描候选数据导入为家庭小票草稿。 */
import { NextRequest } from 'next/server';
import { persistScannedCandidate } from '@/receiptly-api/application/receipts';
import { readScannedCandidate } from '@/receiptly-api/contracts/candidate-payload';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { readObject } from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string }> };

const readClientDraftId = (value: unknown) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'clientDraftId must be a UUID.');
  }
  return value;
};

/** 将 OCR 预览接口返回的候选数据保存为 `needs_review` 草稿。 */
export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    const body = readObject(await request.json());
    const result = await persistScannedCandidate(
      actor,
      householdId,
      readClientDraftId(body.clientDraftId),
      readScannedCandidate({ receipt: body.receipt, lines: body.lines }),
    );
    return dataResponse(result.detail, result.created ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
