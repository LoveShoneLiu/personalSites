/** 文件职责：标准化 OCR 识别出的商品数量，拒绝非法或非正数值。 */
const QUANTITY_PATTERN = /^(\d{1,9}(?:\.\d{1,3})?)\s*(?:x|×)?$/i;

/**
 * 标准化 OCR 数量，同时保留称重商品的小数精度。
 * 零售小票经常使用 `1x` 表示数量；若连同标记一起保存，会破坏金额核对和单价计算。
 */
export const normalizeReceiptQuantity = (value: string | null) => {
  if (value === null) return null;
  const match = value.trim().match(QUANTITY_PATTERN);
  if (!match || Number(match[1]) <= 0) return null;
  return match[1];
};
