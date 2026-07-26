/** 文件职责：识别图片并直接在指定家庭中创建待审核小票。 */
import { NextRequest } from 'next/server';
import { createScannedReceipt } from '@/receiptly-api/application/receipts';
import { ReceiptlyError, dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';
import { extractReceiptFromImage } from '@/receiptly-api/infrastructure/ai/openrouter';

export const runtime = 'nodejs';

const maxImageBytes = 7 * 1024 * 1024;
type Context = { params: Promise<{ householdId: string }> };

type UploadImage = File;

const isUploadImage = (value: FormDataEntryValue | null): value is UploadImage => (
  typeof value === 'object'
  && value !== null
  && typeof value.type === 'string'
  && typeof value.size === 'number'
  && typeof value.arrayBuffer === 'function'
);

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
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

    // 图片 Buffer 只存在于本次请求中，禁止持久化或记录日志。
    const bytes = new Uint8Array(await image.arrayBuffer());
    const recognition = await extractReceiptFromImage(bytes, image.type);
    const receipt = await createScannedReceipt(actor, householdId, recognition.extraction, recognition.model);
    return dataResponse({
      ...receipt,
      recognition: {
        provider: 'openrouter',
        model: recognition.model,
        imageStored: false,
      },
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
