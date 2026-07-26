const QUANTITY_PATTERN = /^(\d{1,9}(?:\.\d{1,3})?)\s*(?:x|×)?$/i;

export const normalizeReceiptQuantity = (value: string | null) => {
  if (value === null) return null;
  const match = value.trim().match(QUANTITY_PATTERN);
  if (!match || Number(match[1]) <= 0) return null;
  return match[1];
};
