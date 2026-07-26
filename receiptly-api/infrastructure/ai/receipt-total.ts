export type ReceiptTotalEvidence = {
  declaredTotalCents: number | null;
  subtotalExcludingTaxCents: number | null;
  taxCents: number | null;
  amountPaidCents: number | null;
};

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
