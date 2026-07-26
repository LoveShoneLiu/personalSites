/** 文件职责：从审核候选小票中生成可展示、可计价的商品列表。 */
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

/** 将有效候选商品行映射为 App 展示所需的商品列表。 */
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
