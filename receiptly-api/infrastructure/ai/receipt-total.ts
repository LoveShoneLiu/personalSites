/** 文件职责：根据实付、未税小计和税额证据修正 OCR 识别的小票含税总额。 */
export type ReceiptTotalEvidence = {
  declaredTotalCents: number | null;
  subtotalExcludingTaxCents: number | null;
  taxCents: number | null;
  amountPaidCents: number | null;
};

/**
 * 从 OCR 结果中选择可信度最高的含税总额依据。
 *
 * 部分新西兰小票会突出显示 `TOTAL EXCL GST`，因此实付金额优先于文字标签；
 * 只有未税小计和税额同时存在时，才使用两者之和修正常见误识别。
 */
export const resolveDeclaredTotalCents = ({
  declaredTotalCents,
  subtotalExcludingTaxCents,
  taxCents,
  amountPaidCents,
}: ReceiptTotalEvidence) => {
  if (amountPaidCents !== null) return amountPaidCents;
  if (
    subtotalExcludingTaxCents !== null
    && taxCents !== null
    && (declaredTotalCents === null || declaredTotalCents === subtotalExcludingTaxCents)
  ) {
    return subtotalExcludingTaxCents + taxCents;
  }
  return declaredTotalCents;
};
