import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const householdRole = pgEnum('receiptly_household_role', ['owner', 'member']);
export const membershipStatus = pgEnum('receiptly_membership_status', ['active', 'removed']);
export const receiptStatus = pgEnum('receiptly_receipt_status', [
  'draft',
  'processing',
  'needs_review',
  'confirmed',
  'deleted',
]);
export const lineStatus = pgEnum('receiptly_line_status', ['included', 'excluded']);
export const lineSource = pgEnum('receiptly_line_source', ['ai', 'manual']);
export const adjustmentType = pgEnum('receiptly_adjustment_type', [
  'discount',
  'refund',
  'tax',
  'non_item_fee',
  'other',
]);

const id = () => uuid('id').defaultRandom().primaryKey();
const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const receiptlyUsers = pgTable('receiptly_users', {
  id: id(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  createdAt: createdAt(),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
});

export const receiptlySessions = pgTable('receiptly_sessions', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => receiptlyUsers.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const households = pgTable('receiptly_households', {
  id: id(),
  name: varchar('name', { length: 120 }).notNull(),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Pacific/Auckland'),
  currency: varchar('currency', { length: 3 }).notNull().default('NZD'),
  ownerUserId: uuid('owner_user_id').notNull().references(() => receiptlyUsers.id),
  version: integer('version').notNull().default(1),
  createdAt: createdAt(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const householdMembers = pgTable('receiptly_household_members', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => receiptlyUsers.id, { onDelete: 'cascade' }),
  role: householdRole('role').notNull(),
  status: membershipStatus('status').notNull().default('active'),
  createdAt: createdAt(),
});

export const spendCategories = pgTable('receiptly_spend_categories', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

export const receipts = pgTable('receiptly_receipts', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').notNull().references(() => receiptlyUsers.id),
  status: receiptStatus('status').notNull().default('draft'),
  storeName: varchar('store_name', { length: 160 }),
  receiptNumber: varchar('receipt_number', { length: 160 }),
  purchasedOn: date('purchased_on'),
  purchasedAtLocal: varchar('purchased_at_local', { length: 16 }),
  totalCents: integer('total_cents'),
  currency: varchar('currency', { length: 3 }),
  version: integer('version').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const receiptLines = pgTable('receiptly_receipt_lines', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull(),
  rawText: varchar('raw_text', { length: 500 }),
  displayName: varchar('display_name', { length: 300 }),
  quantity: numeric('quantity', { precision: 12, scale: 3 }),
  unit: varchar('unit', { length: 16 }),
  packValue: numeric('pack_value', { precision: 12, scale: 3 }),
  packUnit: varchar('pack_unit', { length: 12 }),
  unitPriceCents: integer('unit_price_cents'),
  unitPriceBasis: varchar('unit_price_basis', { length: 16 }),
  lineCents: integer('line_cents'),
  confidence: numeric('confidence', { precision: 4, scale: 3 }),
  source: lineSource('source').notNull().default('manual'),
  categoryId: uuid('category_id').references(() => spendCategories.id),
  promotion: varchar('promotion', { length: 40 }).notNull().default('none'),
  status: lineStatus('status').notNull().default('included'),
  createdAt: createdAt(),
});

export const receiptAdjustments = pgTable('receiptly_receipt_adjustments', {
  id: id(),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  type: adjustmentType('type').notNull(),
  amountCents: integer('amount_cents').notNull(),
  note: varchar('note', { length: 500 }),
  createdAt: createdAt(),
});

export const receiptConfirmations = pgTable('receiptly_receipt_confirmations', {
  id: id(),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  receiptVersion: integer('receipt_version').notNull(),
  confirmedBy: uuid('confirmed_by').notNull().references(() => receiptlyUsers.id),
  totalsSnapshot: jsonb('totals_snapshot').notNull(),
  createdAt: createdAt(),
});

export const auditEvents = pgTable('receiptly_audit_events', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => receiptlyUsers.id),
  action: varchar('action', { length: 100 }).notNull(),
  objectType: varchar('object_type', { length: 80 }).notNull(),
  objectId: uuid('object_id').notNull(),
  changeSummary: jsonb('change_summary').notNull(),
  createdAt: createdAt(),
});
