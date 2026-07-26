/** 文件职责：查询家庭首页的已确认支出汇总与稳定游标分页明细。 */
import {
  and, count, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql, lt,
} from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { ReceiptlyActor, requireMembership } from '@/receiptly-api/infrastructure/auth/guard';
import { getReceiptlyDb, receiptLines, receipts } from '@/receiptly-api/infrastructure/database/client';

type HomeExpenseFilters = {
  start?: string;
  end?: string;
  store?: string;
  product?: string;
  receiptNumber?: string;
  limit: number;
  cursor?: string;
};

type HomeCursor = { purchasedOn: string; createdAt: string; id: string };

// 游标只要求对客户端不透明，并不承担保密作用；先校验格式，避免异常值进入时间和 ID 条件。
const encodeCursor = (cursor: HomeCursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url');

const decodeCursor = (value: string): HomeCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as HomeCursor;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.purchasedOn)
      || typeof parsed.createdAt !== 'string'
      || !parsed.createdAt
      || !parsed.id
    ) throw new Error();
    return parsed;
  } catch {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'cursor is invalid.');
  }
};

/**
 * 查询家庭首页支出。
 * 只统计已确认且未删除的商品行，并使用购买日期、创建时间和 ID 构成稳定游标。
 */
export const listHomeExpenses = async (
  actor: ReceiptlyActor,
  householdId: string,
  filters: HomeExpenseFilters,
) => {
  await requireMembership(actor, householdId);
  const db = getReceiptlyDb();
  // 汇总条件故意不包含游标，保证每一页返回的都是完整筛选结果汇总。
  const summaryWhere = [
    eq(receipts.householdId, householdId),
    eq(receipts.status, 'confirmed'),
    isNull(receipts.deletedAt),
    isNotNull(receipts.purchasedOn),
    eq(receiptLines.status, 'included'),
    isNotNull(receiptLines.lineCents),
  ];
  if (filters.start) summaryWhere.push(gte(receipts.purchasedOn, filters.start));
  if (filters.end) summaryWhere.push(lte(receipts.purchasedOn, filters.end));
  if (filters.store) summaryWhere.push(ilike(receipts.storeName, `%${filters.store}%`));
  if (filters.product) summaryWhere.push(ilike(receiptLines.displayName, `%${filters.product}%`));
  if (filters.receiptNumber) summaryWhere.push(ilike(receipts.receiptNumber, `%${filters.receiptNumber}%`));

  const pageWhere = [...summaryWhere];
  if (filters.cursor) {
    const cursor = decodeCursor(filters.cursor);
    // 保留 PostgreSQL 时间戳精度；经过 JavaScript Date 会丢失微秒，
    // 从而在翻页边界造成记录遗漏或重复。
    pageWhere.push(or(
      lt(receipts.purchasedOn, cursor.purchasedOn),
      and(
        eq(receipts.purchasedOn, cursor.purchasedOn),
        sql<boolean>`${receiptLines.createdAt} < ${cursor.createdAt}::timestamptz`,
      ),
      and(
        eq(receipts.purchasedOn, cursor.purchasedOn),
        sql<boolean>`${receiptLines.createdAt} = ${cursor.createdAt}::timestamptz`,
        lt(receiptLines.id, cursor.id),
      ),
    )!);
  }

  const baseQuery = db
    .select({
      id: receiptLines.id,
      receiptId: receipts.id,
      receiptNumber: receipts.receiptNumber,
      store: receipts.storeName,
      productName: receiptLines.displayName,
      quantity: receiptLines.quantity,
      unit: receiptLines.unit,
      unitPriceCents: receiptLines.unitPriceCents,
      amountCents: receiptLines.lineCents,
      purchasedOn: receipts.purchasedOn,
      purchasedAtLocal: receipts.purchasedAtLocal,
      currency: receipts.currency,
      createdAtCursor: sql<string>`${receiptLines.createdAt}::text`,
    })
    .from(receiptLines)
    .innerJoin(receipts, eq(receiptLines.receiptId, receipts.id))
    .where(and(...pageWhere))
    .orderBy(desc(receipts.purchasedOn), desc(receiptLines.createdAt), desc(receiptLines.id))
    .limit(filters.limit + 1);
  const rows = await baseQuery;
  const visibleRows = rows.slice(0, filters.limit);
  const last = visibleRows.at(-1);

  // 多查询一条记录即可判断 `hasMore`，无需额外统计分页子集。
  const [summary] = await db
    .select({
      lineCount: count(receiptLines.id),
      totalCents: sql<string>`coalesce(sum(${receiptLines.lineCents}), 0)`,
    })
    .from(receiptLines)
    .innerJoin(receipts, eq(receiptLines.receiptId, receipts.id))
    .where(and(...summaryWhere));

  return {
    summary: { lineCount: summary.lineCount, totalCents: Number(summary.totalCents) },
    items: visibleRows.map((row) => ({
      id: row.id,
      receiptId: row.receiptId,
      receiptNumber: row.receiptNumber,
      store: row.store,
      productName: row.productName,
      quantity: row.quantity === null ? null : String(row.quantity),
      unit: row.unit,
      unitPriceCents: row.unitPriceCents,
      amountCents: row.amountCents,
      purchasedOn: row.purchasedOn,
      purchasedAtLocal: row.purchasedAtLocal,
      currency: row.currency,
      status: 'confirmed' as const,
    })),
    page: {
      hasMore: rows.length > filters.limit,
      nextCursor: rows.length > filters.limit && last ? encodeCursor({
        purchasedOn: last.purchasedOn!,
        createdAt: last.createdAtCursor,
        id: last.id,
      }) : null,
    },
  };
};
