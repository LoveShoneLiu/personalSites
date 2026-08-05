/** 文件职责：核对扫描候选商品金额，给出是否允许确认入账的确定性结果。 */
import { CandidateReconciliation, ReceiptCandidate } from '@/receiptly-api/contracts/receipt-candidate';

/**
 * 生成扫描入库和审核界面共用的确定性确认结果。
 * 所有金额始终使用最小货币单位整数，避免浮点误差。
 */
export const reconcileCandidate = (receipt: ReceiptCandidate): CandidateReconciliation => {
  const includedLines = receipt.lines.filter((line) => line.included);
  const productLines = includedLines.filter((line) => line.lineType === 'product');
  const discountLines = includedLines.filter((line) => line.lineType === 'discount');
  const blockingReasons: string[] = [];
  if (!receipt.storeName) blockingReasons.push('MISSING_STORE');
  if (!receipt.purchasedOn) blockingReasons.push('MISSING_DATE');
  if (receipt.declaredTotalCents === null) blockingReasons.push('MISSING_TOTAL');
  if (productLines.length === 0) blockingReasons.push('NO_INCLUDED_LINES');
  if (productLines.some((line) => !line.productName)) blockingReasons.push('MISSING_LINE_PRODUCT');
  if (includedLines.some((line) => line.linePriceCents === null)) blockingReasons.push('MISSING_LINE_PRICE');
  if (productLines.some((line) => (line.linePriceCents ?? 0) < 0)
    || discountLines.some((line) => (line.linePriceCents ?? -1) >= 0)) {
    blockingReasons.push('INVALID_LINE_AMOUNT');
  }

  const lineTotalCents = productLines.reduce((sum, line) => sum + (line.linePriceCents ?? 0), 0);
  const adjustmentTotalCents = discountLines.reduce((sum, line) => sum + (line.linePriceCents ?? 0), 0);
  const differenceCents = receipt.declaredTotalCents === null
    ? null
    : receipt.declaredTotalCents - lineTotalCents - adjustmentTotalCents;
  const isBalanced = differenceCents === 0 && !blockingReasons.includes('MISSING_LINE_PRICE');
  if (differenceCents !== null && differenceCents !== 0) blockingReasons.push('TOTAL_MISMATCH');

  return {
    lineTotalCents,
    adjustmentTotalCents,
    declaredTotalCents: receipt.declaredTotalCents,
    differenceCents,
    isBalanced,
    canConfirm: isBalanced && blockingReasons.length === 0,
    blockingReasons,
  };
};
