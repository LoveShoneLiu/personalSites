/** 文件职责：定义 OCR 候选小票、候选商品行及金额核对结果的数据结构。 */
export type ReceiptCandidateLine = {
  sortOrder: number;
  lineType: 'product' | 'discount';
  rawText: string | null;
  productName: string | null;
  quantity: string | null;
  unit: string | null;
  unitPriceCents: number | null;
  unitPriceBasis: string | null;
  linePriceCents: number | null;
  confidence: number | null;
  source: 'ai' | 'manual';
  included: boolean;
};

export type ReceiptCandidate = {
  storeName: string | null;
  receiptNumber: string | null;
  purchasedOn: string | null;
  purchasedAtLocal: string | null;
  currency: string | null;
  declaredTotalCents: number | null;
  lines: ReceiptCandidateLine[];
};

export type CandidateReconciliation = {
  lineTotalCents: number;
  adjustmentTotalCents: number;
  declaredTotalCents: number | null;
  differenceCents: number | null;
  isBalanced: boolean;
  canConfirm: boolean;
  blockingReasons: string[];
};
