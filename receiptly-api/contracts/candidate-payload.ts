/** 文件职责：将 App 提交的扫描审核结果重新校验并转换为内部候选契约。 */
import { normalizeReceiptQuantity } from '@/receiptly-api/domain/quantity';
import { ReceiptCandidate } from './receipt-candidate';
import { ReceiptlyError } from './errors';
import { readObject } from './validation';

const nullableString = (value: unknown, field: string, maxLength: number) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must be a string or null.`);
  }
  return value.trim() || null;
};

const nullableInteger = (value: unknown, field: string) => {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must be a non-negative integer or null.`);
  }
  return value as number;
};

const nullableSignedInteger = (value: unknown, field: string) => {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must be an integer or null.`);
  }
  return value as number;
};

/**
 * 在 API 信任边界重新校验由 App 编辑过的 OCR 候选数据。
 * 客户端可以修改所有审核字段，因此不能只依赖此前的模型输出 Schema。
 */
export const readScannedCandidate = (value: unknown): ReceiptCandidate => {
  const body = readObject(value);
  const receipt = readObject(body.receipt);
  if (!Array.isArray(body.lines)) throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'lines must be an array.');
  return {
    storeName: nullableString(receipt.storeName, 'receipt.storeName', 160),
    receiptNumber: nullableString(receipt.receiptNumber, 'receipt.receiptNumber', 160),
    purchasedOn: nullableString(receipt.purchasedOn, 'receipt.purchasedOn', 10),
    purchasedAtLocal: nullableString(receipt.purchasedAtLocal, 'receipt.purchasedAtLocal', 16),
    currency: nullableString(receipt.currency, 'receipt.currency', 3),
    declaredTotalCents: nullableInteger(receipt.declaredTotalCents, 'receipt.declaredTotalCents'),
    lines: body.lines.map((lineValue, sortOrder) => {
      const line = readObject(lineValue);
      const signedLinePriceCents = nullableSignedInteger(
        line.linePriceCents,
        `lines[${sortOrder}].linePriceCents`,
      );
      const lineType = line.lineType === 'discount'
        || (line.lineType === undefined && signedLinePriceCents !== null && signedLinePriceCents < 0)
        ? 'discount' as const
        : 'product' as const;
      if (line.lineType !== undefined && line.lineType !== 'product' && line.lineType !== 'discount') {
        throw new ReceiptlyError(400, 'VALIDATION_ERROR', `lines[${sortOrder}].lineType is invalid.`);
      }
      if (lineType === 'discount' && signedLinePriceCents !== null && signedLinePriceCents >= 0) {
        throw new ReceiptlyError(400, 'VALIDATION_ERROR', `lines[${sortOrder}].linePriceCents must be negative for a discount.`);
      }
      if (lineType === 'product' && signedLinePriceCents !== null && signedLinePriceCents < 0) {
        throw new ReceiptlyError(400, 'VALIDATION_ERROR', `lines[${sortOrder}].linePriceCents must be non-negative for a product.`);
      }
      const source = line.source === 'manual' ? 'manual' : 'ai';
      if (line.source !== undefined && line.source !== 'ai' && line.source !== 'manual') {
        throw new ReceiptlyError(400, 'VALIDATION_ERROR', `lines[${sortOrder}].source is invalid.`);
      }
      const rawQuantity = nullableString(line.quantity, `lines[${sortOrder}].quantity`, 32);
      const quantity = normalizeReceiptQuantity(rawQuantity);
      if (rawQuantity !== null && quantity === null) {
        throw new ReceiptlyError(
          400,
          'VALIDATION_ERROR',
          `lines[${sortOrder}].quantity must be a positive number with up to 3 decimal places.`,
        );
      }
      return {
        sortOrder,
        lineType,
        rawText: nullableString(line.rawText, `lines[${sortOrder}].rawText`, 500),
        productName: nullableString(line.productName, `lines[${sortOrder}].productName`, 300),
        quantity,
        unit: nullableString(line.unit, `lines[${sortOrder}].unit`, 16),
        unitPriceCents: lineType === 'discount'
          ? null
          : nullableInteger(line.unitPriceCents, `lines[${sortOrder}].unitPriceCents`),
        unitPriceBasis: lineType === 'discount'
          ? null
          : nullableString(line.unitPriceBasis, `lines[${sortOrder}].unitPriceBasis`, 16),
        linePriceCents: signedLinePriceCents,
        confidence: null,
        source,
        included: line.included !== false,
      };
    }),
  };
};
