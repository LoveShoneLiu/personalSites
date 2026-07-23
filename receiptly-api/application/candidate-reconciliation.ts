import { CandidateReconciliation, ReceiptCandidate } from '@/receiptly-api/contracts/receipt-candidate';

export const reconcileCandidate = (receipt: ReceiptCandidate): CandidateReconciliation => {
  const includedLines = receipt.lines.filter((line) => line.included);
  const blockingReasons: string[] = [];
  if (!receipt.storeName) blockingReasons.push('MISSING_STORE');
  if (!receipt.purchasedOn) blockingReasons.push('MISSING_DATE');
  if (receipt.declaredTotalCents === null) blockingReasons.push('MISSING_TOTAL');
  if (includedLines.length === 0) blockingReasons.push('NO_INCLUDED_LINES');
  if (includedLines.some((line) => !line.productName)) blockingReasons.push('MISSING_LINE_PRODUCT');
  if (includedLines.some((line) => line.linePriceCents === null)) blockingReasons.push('MISSING_LINE_PRICE');

  const lineTotalCents = includedLines.reduce((sum, line) => sum + (line.linePriceCents ?? 0), 0);
  const adjustmentTotalCents = 0;
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
