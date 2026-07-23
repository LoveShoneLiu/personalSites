export type ReceiptCandidateLine = {
  sortOrder: number;
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
