import { NextRequest } from 'next/server';
import { ReceiptlyError, dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { ReceiptCandidateLine } from '@/receiptly-api/contracts/receipt-candidate';
import { extractReceiptFromImage } from '@/receiptly-api/infrastructure/ai/openrouter';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

const maxImageBytes = 7 * 1024 * 1024;

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
      throw new ReceiptlyError(400, 'IMAGE_INVALID', 'image must be between 1 byte and 7 MB.');
    }

    // The buffer only exists during this request. It is neither logged nor stored.
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
