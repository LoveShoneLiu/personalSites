/** 文件职责：识别小票图片并返回不写数据库的审核候选数据。 */
import { NextRequest } from 'next/server';
import { ReceiptlyError, dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { ReceiptCandidateLine } from '@/receiptly-api/contracts/receipt-candidate';
import { extractReceiptFromImage } from '@/receiptly-api/infrastructure/ai/openrouter';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';
// 为视觉模型调用预留充足时间；部署环境必须启用 Vercel Fluid Compute。
export const maxDuration = 180;

// 即使托管平台可能设置更低的传输上限，应用层仍需保留大小校验；
// App 在生产环境发送 multipart 数据前，应先将图片压缩到平台限制以内。
const maxImageBytes = 4 * 1024 * 1024;

type UploadImage = File;

const isUploadImage = (value: FormDataEntryValue | null): value is UploadImage => (
  typeof value === 'object'
  && value !== null
  && typeof value.type === 'string'
  && typeof value.size === 'number'
  && typeof value.arrayBuffer === 'function'
);

const normalizedUnit = (unit: string | null) => unit?.trim().toLowerCase() || null;

const normalizedUnitPriceBasis = (basis: string | null) => {
  const normalized = basis?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith('per ')) return normalized.slice(4);
  if (normalized === 'each' || normalized === 'unit' || normalized === 'bottle') return 'item';
  return normalized;
};

const responseLine = (line: ReceiptCandidateLine) => ({
  id: crypto.randomUUID(),
  lineType: line.lineType,
  rawText: line.rawText,
  productName: line.productName,
  quantity: line.quantity,
  unit: normalizedUnit(line.unit),
  unitPriceCents: line.unitPriceCents,
  unitPriceBasis: normalizedUnitPriceBasis(line.unitPriceBasis),
  linePriceCents: line.linePriceCents,
  source: line.source,
  included: line.included,
});

/**
 * 返回尚未持久化的审核候选数据。
 * 只有经过认证的用户明确确认后，服务端才会写入家庭小票和商品行。
 */
export async function POST(request: NextRequest) {
  try {
    await requireActor(request);
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ReceiptlyError(400, 'IMAGE_INVALID', 'Request must use multipart/form-data with an image field.');
    }
    const image = formData.get('image');
    if (!isUploadImage(image)) {
      throw new ReceiptlyError(400, 'IMAGE_INVALID', 'image must be a JPEG or PNG file.');
    }
    if (image.type !== 'image/jpeg' && image.type !== 'image/png') {
      throw new ReceiptlyError(400, 'IMAGE_INVALID', 'image must be a JPEG or PNG file.');
    }
    if (image.size === 0 || image.size > maxImageBytes) {
      throw new ReceiptlyError(400, 'IMAGE_INVALID', 'image must be between 1 byte and 4 MB.');
    }

    // 图片 Buffer 只存在于本次请求中，禁止记录日志或持久化。
    const bytes = new Uint8Array(await image.arrayBuffer());
    const recognition = await extractReceiptFromImage(bytes, image.type);
    return dataResponse({
      receipt: {
        id: crypto.randomUUID(),
        status: 'needs_review',
        storeName: recognition.extraction.storeName,
        receiptNumber: recognition.extraction.receiptNumber,
        purchasedOn: recognition.extraction.purchasedOn,
        purchasedAtLocal: recognition.extraction.purchasedAtLocal,
        currency: recognition.extraction.currency,
        declaredTotalCents: recognition.extraction.declaredTotalCents,
        version: 1,
      },
      lines: recognition.extraction.lines.map(responseLine),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
