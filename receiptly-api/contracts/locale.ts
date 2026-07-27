/** 文件职责：定义 Receiptly 当前支持的 App 语言，并在 API 边界严格校验 locale。 */
import { ReceiptlyError } from './errors';

export type ReceiptlyLocale = 'en-NZ' | 'zh-CN';

/** 只接受已提供完整邮件模板的语言，防止未知 locale 意外回退到错误语言。 */
export const readReceiptlyLocale = (
  value: unknown,
  fallback: ReceiptlyLocale,
): ReceiptlyLocale => {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === 'en-NZ' || value === 'zh-CN') return value;
  throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'locale must be en-NZ or zh-CN.');
};
