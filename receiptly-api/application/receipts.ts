import {
  and, asc, eq, isNull,
} from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { ReceiptCandidate } from '@/receiptly-api/contracts/receipt-candidate';
import { reconcileCandidate } from '@/receiptly-api/application/candidate-reconciliation';
import { ReceiptlyActor, requireMembership } from '@/receiptly-api/infrastructure/auth/guard';
import {
  auditEvents,
  getReceiptlyDb,
  receiptAdjustments,
  receiptConfirmations,
  receiptLines,
  receipts,
} from '@/receiptly-api/infrastructure/database/client';
import { ReceiptExtraction } from '@/receiptly-api/infrastructure/ai/openrouter';

type ReceiptInput = { storeName: string | null; purchasedOn: string; totalCents: number; currency?: string };
type LineInput = {
  displayName: string;
  lineCents: number;
  rawText?: string | null;
  quantity?: string;
  packValue?: string | null;
  packUnit?: string | null;
  promotion?: string;
  status?: 'included' | 'excluded';
};

export type PersistedCandidateDetail = {
  receipt: {
    id: string;
    status: 'draft' | 'processing' | 'needs_review' | 'confirmed' | 'deleted';
    storeName: string | null;
    receiptNumber: string | null;
    purchasedOn: string | null;
    purchasedAtLocal: string | null;
    currency: string | null;
    declaredTotalCents: number | null;
    version: number;
  };
  lines: Array<{
    id: string;
    rawText: string | null;
    productName: string | null;
    quantity: string | null;
    unit: string | null;
    unitPriceCents: number | null;
    unitPriceBasis: string | null;
    linePriceCents: number | null;
    source: 'ai' | 'manual';
    included: boolean;
  }>;
};

const loadReceipt = async (receiptId: string, actor: ReceiptlyActor) => {
  const db = getReceiptlyDb();
  const result = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, receiptId), isNull(receipts.deletedAt)))
    .limit(1);
  const receipt = result[0];
  if (!receipt) throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
  const membership = await requireMembership(actor, receipt.householdId);
  if (receipt.creatorId !== actor.userId && membership.role !== 'owner') {
    throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
  }
  return receipt;
};

const assertEditable = (status: string) => {
  if (status !== 'draft' && status !== 'needs_review') {
    throw new ReceiptlyError(409, 'INVALID_STATE_TRANSITION', 'Receipt must be reopened before it can be edited.');
  }
};

const receiptDetail = async (receiptId: string) => {
  const db = getReceiptlyDb();
  const [receipt] = await db.select().from(receipts).where(eq(receipts.id, receiptId));
  const [lines, adjustments] = await Promise.all([
    db.select()
      .from(receiptLines)
      .where(eq(receiptLines.receiptId, receiptId))
      .orderBy(asc(receiptLines.sortOrder)),
    db.select().from(receiptAdjustments).where(eq(receiptAdjustments.receiptId, receiptId)),
  ]);
  return { receipt, lines, adjustments };
};

const candidateDetail = async (receiptId: string): Promise<PersistedCandidateDetail> => {
  const { receipt, lines } = await receiptDetail(receiptId);
  if (!receipt) throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
  return {
    receipt: {
      id: receipt.id,
      status: receipt.status,
      storeName: receipt.storeName,
      receiptNumber: receipt.receiptNumber,
      purchasedOn: receipt.purchasedOn,
      purchasedAtLocal: receipt.purchasedAtLocal,
      currency: receipt.currency,
      declaredTotalCents: receipt.totalCents,
      version: receipt.version,
    },
    lines: lines.map((line) => ({
      id: line.id,
      rawText: line.rawText,
      productName: line.displayName,
      quantity: line.quantity === null ? null : String(line.quantity),
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      unitPriceBasis: line.unitPriceBasis,
      linePriceCents: line.lineCents,
      source: line.source,
      included: line.status === 'included',
    })),
  };
};

export const createReceipt = async (actor: ReceiptlyActor, householdId: string, input: ReceiptInput) => {
  await requireMembership(actor, householdId);
  const [receipt] = await getReceiptlyDb().insert(receipts).values({
    householdId,
    creatorId: actor.userId,
    storeName: input.storeName,
    purchasedOn: input.purchasedOn,
    totalCents: input.totalCents,
    currency: input.currency ?? 'NZD',
    status: 'draft',
  }).returning();
  return receipt;
};

export const createScannedReceipt = async (
  actor: ReceiptlyActor,
  householdId: string,
  extraction: ReceiptExtraction,
  model: string,
) => {
  await requireMembership(actor, householdId);
  const { purchasedOn, declaredTotalCents } = extraction;
  const currency = extraction.currency && /^[a-z]{3}$/i.test(extraction.currency)
    ? extraction.currency.toUpperCase()
    : null;

  const db = getReceiptlyDb();
  return db.transaction(async (tx) => {
    const [receipt] = await tx.insert(receipts).values({
      householdId,
      creatorId: actor.userId,
      storeName: extraction.storeName?.trim() || null,
      receiptNumber: extraction.receiptNumber?.trim() || null,
      purchasedOn,
      purchasedAtLocal: extraction.purchasedAtLocal,
      totalCents: declaredTotalCents,
      currency,
      status: 'needs_review',
      entryMode: 'scan',
      scanProvider: 'openrouter',
      scanModel: model,
    }).returning();

    const candidateLines = extraction.lines.filter((line) => (
      line.rawText !== null
      || line.productName !== null
      || line.linePriceCents !== null
    ));
    const lines = candidateLines.length === 0
      ? []
      : await tx.insert(receiptLines)
        .values(candidateLines.map((line) => ({
          householdId,
          receiptId: receipt.id,
          sortOrder: line.sortOrder,
          rawText: line.rawText?.trim() || null,
          displayName: line.productName?.trim() || null,
          quantity: line.quantity,
          unit: line.unit,
          unitPriceCents: line.unitPriceCents,
          unitPriceBasis: line.unitPriceBasis,
          lineCents: line.linePriceCents,
          confidence: line.confidence?.toString() ?? null,
          source: line.source,
          status: 'included' as const,
        })))
        .returning();
    await tx.insert(auditEvents).values({
      householdId,
      actorId: actor.userId,
      action: 'receipt.scanned',
      objectType: 'receipt',
      objectId: receipt.id,
      changeSummary: { model, lineCount: lines.length, imageStored: false },
    });
    return { receipt, lines };
  });
};

/**
 * Converts the non-persistent /receipts/scan candidate into a real household draft.
 * `clientDraftId` makes retrying safe when the mobile network disconnects after a write.
 */
export const persistScannedCandidate = async (
  actor: ReceiptlyActor,
  householdId: string,
  clientDraftId: string,
  candidate: ReceiptCandidate,
) => {
  await requireMembership(actor, householdId);
  const db = getReceiptlyDb();
  const [existing] = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(and(
      eq(receipts.householdId, householdId),
      eq(receipts.creatorId, actor.userId),
      eq(receipts.clientDraftId, clientDraftId),
    ))
    .limit(1);
  if (existing) return { created: false, detail: await candidateDetail(existing.id) };

  const currency = candidate.currency && /^[a-z]{3}$/i.test(candidate.currency)
    ? candidate.currency.toUpperCase()
    : null;
  const validLines = candidate.lines.filter((line) => (
    line.rawText !== null || line.productName !== null || line.linePriceCents !== null
  ));

  const result = await db.transaction(async (tx) => {
    const [receipt] = await tx.insert(receipts).values({
      householdId,
      creatorId: actor.userId,
      clientDraftId,
      entryMode: 'scan',
      status: 'needs_review',
      storeName: candidate.storeName?.trim() || null,
      receiptNumber: candidate.receiptNumber?.trim() || null,
      purchasedOn: candidate.purchasedOn,
      purchasedAtLocal: candidate.purchasedAtLocal,
      totalCents: candidate.declaredTotalCents,
      currency,
    }).returning();
    const lines = validLines.length === 0 ? [] : await tx.insert(receiptLines).values(
      validLines.map((line, sortOrder) => ({
        householdId,
        receiptId: receipt.id,
        sortOrder,
        rawText: line.rawText?.trim() || null,
        displayName: line.productName?.trim() || null,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        unitPriceBasis: line.unitPriceBasis,
        lineCents: line.linePriceCents,
        confidence: line.confidence?.toString() ?? null,
        source: line.source,
        status: line.included ? 'included' as const : 'excluded' as const,
      })),
    ).returning();
    await tx.insert(auditEvents).values({
      householdId,
      actorId: actor.userId,
      action: 'receipt.candidate_imported',
      objectType: 'receipt',
      objectId: receipt.id,
      changeSummary: { clientDraftId, lineCount: lines.length, imageStored: false },
    });
    return receipt.id;
  });
  return { created: true, detail: await candidateDetail(result) };
};

/**
 * Saves a user-reviewed scan as a confirmed receipt in one transaction.
 * This is used by the temporary mock-auth confirmation route.
 */
export const confirmScannedCandidate = async (
  actor: ReceiptlyActor,
  householdId: string,
  clientDraftId: string,
  candidate: ReceiptCandidate,
) => {
  await requireMembership(actor, householdId);
  const totals = reconcileCandidate(candidate);
  if (!totals.canConfirm) {
    throw new ReceiptlyError(422, 'VALIDATION_ERROR', 'Receipt has incomplete fields and cannot be confirmed.', {
      blockingReasons: totals.blockingReasons,
      differenceCents: totals.differenceCents,
    });
  }

  const db = getReceiptlyDb();
  const [existing] = await db
    .select({ id: receipts.id, status: receipts.status })
    .from(receipts)
    .where(and(
      eq(receipts.householdId, householdId),
      eq(receipts.creatorId, actor.userId),
      eq(receipts.clientDraftId, clientDraftId),
    ))
    .limit(1);
  if (existing) {
    if (existing.status !== 'confirmed') {
      throw new ReceiptlyError(409, 'VERSION_CONFLICT', 'This scan has already been saved and is awaiting review.');
    }
    return { created: false, detail: await candidateDetail(existing.id) };
  }

  const receiptNumber = candidate.receiptNumber?.trim() || null;
  if (
    receiptNumber !== null
    && candidate.purchasedOn !== null
    && candidate.declaredTotalCents !== null
  ) {
    const [duplicate] = await db.select({ id: receipts.id }).from(receipts).where(and(
      eq(receipts.householdId, householdId),
      eq(receipts.status, 'confirmed'),
      eq(receipts.receiptNumber, receiptNumber),
      eq(receipts.purchasedOn, candidate.purchasedOn),
      eq(receipts.totalCents, candidate.declaredTotalCents),
      isNull(receipts.deletedAt),
    )).limit(1);
    if (duplicate) {
      throw new ReceiptlyError(
        409,
        'DUPLICATE_RECEIPT',
        '这张小票已经入账。',
        { existingReceiptId: duplicate.id },
      );
    }
  }

  const currency = candidate.currency && /^[a-z]{3}$/i.test(candidate.currency)
    ? candidate.currency.toUpperCase()
    : null;
  const linesToSave = candidate.lines.filter((line) => (
    line.rawText !== null || line.productName !== null || line.linePriceCents !== null
  ));
  const receiptId = await db.transaction(async (tx) => {
    const [receipt] = await tx.insert(receipts).values({
      householdId,
      creatorId: actor.userId,
      clientDraftId,
      entryMode: 'scan',
      status: 'confirmed',
      storeName: candidate.storeName?.trim() || null,
      receiptNumber,
      purchasedOn: candidate.purchasedOn,
      purchasedAtLocal: candidate.purchasedAtLocal,
      totalCents: candidate.declaredTotalCents,
      currency,
    }).returning();
    const lines = linesToSave.length === 0 ? [] : await tx.insert(receiptLines).values(
      linesToSave.map((line, sortOrder) => ({
        householdId,
        receiptId: receipt.id,
        sortOrder,
        rawText: line.rawText?.trim() || null,
        displayName: line.productName?.trim() || null,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        unitPriceBasis: line.unitPriceBasis,
        lineCents: line.linePriceCents,
        confidence: line.confidence?.toString() ?? null,
        source: line.source,
        status: line.included ? 'included' as const : 'excluded' as const,
      })),
    ).returning();
    await tx.insert(receiptConfirmations).values({
      receiptId: receipt.id,
      receiptVersion: receipt.version,
      confirmedBy: actor.userId,
      totalsSnapshot: totals,
    });
    await tx.insert(auditEvents).values({
      householdId,
      actorId: actor.userId,
      action: 'receipt.scan_confirmed',
      objectType: 'receipt',
      objectId: receipt.id,
      changeSummary: { clientDraftId, lineCount: lines.length, totalCents: receipt.totalCents },
    });
    return receipt.id;
  });
  return { created: true, detail: await candidateDetail(receiptId) };
};

export const listReceipts = async (actor: ReceiptlyActor, householdId: string) => {
  await requireMembership(actor, householdId);
  return getReceiptlyDb()
    .select()
    .from(receipts)
    .where(and(eq(receipts.householdId, householdId), isNull(receipts.deletedAt)))
    .orderBy(asc(receipts.purchasedOn));
};

export const getReceipt = async (actor: ReceiptlyActor, receiptId: string) => {
  await loadReceipt(receiptId, actor);
  return receiptDetail(receiptId);
};

export const addReceiptLine = async (actor: ReceiptlyActor, receiptId: string, input: LineInput) => {
  const receipt = await loadReceipt(receiptId, actor);
  assertEditable(receipt.status);
  const db = getReceiptlyDb();
  const existing = await db
    .select({ id: receiptLines.id })
    .from(receiptLines)
    .where(eq(receiptLines.receiptId, receiptId));
  const [line] = await db.insert(receiptLines).values({
    householdId: receipt.householdId,
    receiptId,
    sortOrder: existing.length,
    displayName: input.displayName,
    lineCents: input.lineCents,
    rawText: input.rawText ?? null,
    quantity: input.quantity ?? '1',
    packValue: input.packValue ?? null,
    packUnit: input.packUnit ?? null,
    promotion: input.promotion ?? 'none',
    status: input.status ?? 'included',
  }).returning();
  await db
    .update(receipts)
    .set({ version: receipt.version + 1, updatedAt: new Date() })
    .where(eq(receipts.id, receiptId));
  return line;
};

export const addReceiptAdjustment = async (
  actor: ReceiptlyActor,
  receiptId: string,
  input: {
    type: 'discount' | 'refund' | 'tax' | 'non_item_fee' | 'other';
    amountCents: number;
    note?: string | null;
  },
) => {
  const receipt = await loadReceipt(receiptId, actor);
  assertEditable(receipt.status);
  const [adjustment] = await getReceiptlyDb()
    .insert(receiptAdjustments)
    .values({ receiptId, ...input })
    .returning();
  await getReceiptlyDb()
    .update(receipts)
    .set({ version: receipt.version + 1, updatedAt: new Date() })
    .where(eq(receipts.id, receiptId));
  return adjustment;
};

export const reconciliation = async (actor: ReceiptlyActor, receiptId: string) => {
  const receipt = await loadReceipt(receiptId, actor);
  const detail = await receiptDetail(receiptId);
  const includedLines = detail.lines.filter((line) => line.status === 'included');
  const itemTotalCents = includedLines.reduce((sum, line) => sum + (line.lineCents ?? 0), 0);
  const adjustmentTotalCents = detail.adjustments.reduce((sum, adjustment) => sum + adjustment.amountCents, 0);
  const differenceCents = receipt.totalCents === null
    ? null
    : receipt.totalCents - itemTotalCents - adjustmentTotalCents;
  const missingLinePriceIds = includedLines.filter((line) => line.lineCents === null).map((line) => line.id);
  const missingLineProductIds = includedLines.filter((line) => !line.displayName).map((line) => line.id);
  const blockingReasons: string[] = [];
  if (!receipt.storeName) blockingReasons.push('MISSING_STORE');
  if (!receipt.purchasedOn) blockingReasons.push('MISSING_DATE');
  if (receipt.totalCents === null) blockingReasons.push('MISSING_TOTAL');
  if (includedLines.length === 0) blockingReasons.push('NO_INCLUDED_LINES');
  if (missingLinePriceIds.length > 0) blockingReasons.push('MISSING_LINE_PRICE');
  if (missingLineProductIds.length > 0) blockingReasons.push('MISSING_LINE_PRODUCT');
  if (differenceCents !== null && differenceCents !== 0) blockingReasons.push('TOTAL_MISMATCH');
  return {
    lineTotalCents: itemTotalCents,
    adjustmentTotalCents,
    declaredTotalCents: receipt.totalCents,
    differenceCents,
    isBalanced: differenceCents === 0 && missingLinePriceIds.length === 0,
    missingLinePriceIds,
    missingLineProductIds,
    blockingReasons,
    canConfirm: differenceCents === 0 && blockingReasons.length === 0,
  };
};

export const confirmReceipt = async (actor: ReceiptlyActor, receiptId: string, expectedVersion: number) => {
  const receipt = await loadReceipt(receiptId, actor);
  assertEditable(receipt.status);
  if (receipt.version !== expectedVersion) {
    throw new ReceiptlyError(409, 'VERSION_CONFLICT', 'Receipt has changed. Refresh and review it again.');
  }
  const totals = await reconciliation(actor, receiptId);
  if (totals.differenceCents === null || totals.differenceCents !== 0) {
    throw new ReceiptlyError(422, 'RECEIPT_TOTAL_MISMATCH', 'Receipt total does not match confirmed lines.', { differenceCents: totals.differenceCents });
  }
  if (!totals.canConfirm) {
    throw new ReceiptlyError(422, 'VALIDATION_ERROR', 'Receipt has incomplete fields and cannot be confirmed.', { blockingReasons: totals.blockingReasons });
  }

  const db = getReceiptlyDb();
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(receipts).set({
      status: 'confirmed', version: receipt.version + 1, updatedAt: new Date(),
    }).where(and(eq(receipts.id, receiptId), eq(receipts.version, expectedVersion))).returning();
    if (!updated) throw new ReceiptlyError(409, 'VERSION_CONFLICT', 'Receipt has changed. Refresh and review it again.');
    await tx.insert(receiptConfirmations).values({
      receiptId, receiptVersion: updated.version, confirmedBy: actor.userId, totalsSnapshot: totals,
    });
    await tx.insert(auditEvents).values({
      householdId: receipt.householdId,
      actorId: actor.userId,
      action: 'receipt.confirmed',
      objectType: 'receipt',
      objectId: receipt.id,
      changeSummary: { receiptVersion: updated.version, totalCents: updated.totalCents },
    });
    return updated;
  });
};

export const deleteReceipt = async (actor: ReceiptlyActor, receiptId: string) => {
  const receipt = await loadReceipt(receiptId, actor);
  const db = getReceiptlyDb();
  return db.transaction(async (tx) => {
    const [deleted] = await tx.update(receipts).set({
      status: 'deleted', deletedAt: new Date(), version: receipt.version + 1, updatedAt: new Date(),
    }).where(eq(receipts.id, receiptId)).returning();
    await tx.insert(auditEvents).values({
      householdId: receipt.householdId,
      actorId: actor.userId,
      action: 'receipt.deleted',
      objectType: 'receipt',
      objectId: receipt.id,
      changeSummary: { previousStatus: receipt.status },
    });
    return deleted;
  });
};
