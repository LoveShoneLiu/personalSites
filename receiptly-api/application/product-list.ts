import { ReceiptCandidate } from '@/receiptly-api/contracts/receipt-candidate';

export type ReceiptProductListItem = {
  supermarket: string | null;
  receiptNumber: string | null;
  sortOrder: number;
  productName: string | null;
  priceCents: number | null;
  unitPriceCents: number | null;
  purchasedAtLocal: string | null;
};

export const createProductList = (receipt: ReceiptCandidate): ReceiptProductListItem[] => (
  receipt.lines.map((line) => ({
    supermarket: receipt.storeName,
    receiptNumber: receipt.receiptNumber,
    sortOrder: line.sortOrder,
    productName: line.productName,
    priceCents: line.linePriceCents,
    unitPriceCents: line.unitPriceCents,
    purchasedAtLocal: receipt.purchasedAtLocal,
  }))
);
