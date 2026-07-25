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
      const source = line.source === 'manual' ? 'manual' : 'ai';
      if (line.source !== undefined && line.source !== 'ai' && line.source !== 'manual') {
        throw new ReceiptlyError(400, 'VALIDATION_ERROR', `lines[${sortOrder}].source is invalid.`);
      }
      const quantity = nullableString(line.quantity, `lines[${sortOrder}].quantity`, 32);
      return {
        sortOrder,
        rawText: nullableString(line.rawText, `lines[${sortOrder}].rawText`, 500),
        productName: nullableString(line.productName, `lines[${sortOrder}].productName`, 300),
        quantity,
        unit: nullableString(line.unit, `lines[${sortOrder}].unit`, 16),
        unitPriceCents: nullableInteger(line.unitPriceCents, `lines[${sortOrder}].unitPriceCents`),
        unitPriceBasis: nullableString(line.unitPriceBasis, `lines[${sortOrder}].unitPriceBasis`, 16),
        linePriceCents: nullableInteger(line.linePriceCents, `lines[${sortOrder}].linePriceCents`),
        confidence: null,
        source,
        included: line.included !== false,
      };
    }),
  };
};
