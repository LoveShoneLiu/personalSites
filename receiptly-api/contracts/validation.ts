/** 文件职责：提供 Route Handler 共用的基础对象、字符串、整数和日期校验器。 */
import { ReceiptlyError } from './errors';

export const readObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'Request body must be an object.');
  }
  return value as Record<string, unknown>;
};

export const requiredString = (value: unknown, field: string, maxLength = 255) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} is required and must be valid.`);
  }
  return value.trim();
};

export const optionalString = (value: unknown, field: string, maxLength = 255) => {
  if (value === undefined || value === null || value === '') return null;
  return requiredString(value, field, maxLength);
};

export const requiredInteger = (value: unknown, field: string, min = 0) => {
  if (!Number.isInteger(value) || (value as number) < min) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must be an integer of at least ${min}.`);
  }
  return value as number;
};

export const requiredIsoDate = (value: unknown, field: string) => {
  const date = requiredString(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must use YYYY-MM-DD.`);
  }
  return date;
};
