/** 文件职责：声明 Receiptly 认证、家庭、小票、商品及审计相关数据库 Schema。 */
import {
  boolean,
  date,
  integer,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const householdRole = pgEnum('receiptly_household_role', ['owner', 'member']);
export const membershipStatus = pgEnum('receiptly_membership_status', ['active', 'removed']);
export const authProvider = pgEnum('receiptly_auth_provider', ['google', 'apple', 'email']);
export const authPlatform = pgEnum('receiptly_auth_platform', ['ios', 'android', 'web']);
export const userStatus = pgEnum('receiptly_user_status', ['active', 'deletion_pending', 'deleted']);
export const receiptStatus = pgEnum('receiptly_receipt_status', [
  'draft',
  'processing',
  'needs_review',
  'confirmed',
  'deleted',
]);
export const lineStatus = pgEnum('receiptly_line_status', ['included', 'excluded']);
export const lineSource = pgEnum('receiptly_line_source', ['ai', 'manual']);
export const receiptEntryMode = pgEnum('receiptly_receipt_entry_mode', ['manual', 'scan']);
export const extractionRunStatus = pgEnum('receiptly_extraction_run_status', [
  'processing',
  'succeeded',
  'failed',
]);
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
  email: varchar('email', { length: 320 }).unique(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 120 }),
  status: userStatus('status').notNull().default('active'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordFailedAttempts: integer('password_failed_attempts').notNull().default(0),
  passwordLockedUntil: timestamp('password_locked_until', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const receiptlySessions = pgTable('receiptly_sessions', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => receiptlyUsers.id, { onDelete: 'cascade' }),
  tokenFamilyId: uuid('token_family_id').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  rotatedFromSessionId: uuid('rotated_from_session_id'),
  installationId: uuid('installation_id').notNull(),
  deviceName: varchar('device_name', { length: 160 }),
  platform: authPlatform('platform').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokeReason: varchar('revoke_reason', { length: 80 }),
  createdAt: createdAt(),
}, (table) => [
  index('receiptly_sessions_user_expiry_idx').on(table.userId, table.expiresAt),
  index('receiptly_sessions_family_idx').on(table.tokenFamilyId, table.revokedAt),
]);

export const receiptlyAuthIdentities = pgTable('receiptly_auth_identities', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => receiptlyUsers.id, { onDelete: 'cascade' }),
  provider: authProvider('provider').notNull(),
  providerSubject: varchar('provider_subject', { length: 255 }).notNull(),
  providerEmail: varchar('provider_email', { length: 320 }),
  providerEmailVerifiedAt: timestamp('provider_email_verified_at', { withTimezone: true }),
  profile: jsonb('profile'),
  createdAt: createdAt(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('receiptly_auth_identities_provider_subject_idx').on(table.provider, table.providerSubject),
  index('receiptly_auth_identities_user_idx').on(table.userId, table.revokedAt),
]);

export const receiptlyAuthChallenges = pgTable('receiptly_auth_challenges', {
  id: id(),
  provider: authProvider('provider').notNull(),
  rawNonce: varchar('raw_nonce', { length: 128 }).notNull(),
  stateHash: text('state_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  index('receiptly_auth_challenges_expiry_idx').on(table.provider, table.expiresAt),
]);

export const receiptlyEmailLoginCodes = pgTable('receiptly_email_login_codes', {
  id: id(),
  email: varchar('email', { length: 320 }).notNull(),
  codeHash: text('code_hash').notNull(),
  installationId: uuid('installation_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  resendAvailableAt: timestamp('resend_available_at', { withTimezone: true }).notNull(),
  attemptCount: integer('attempt_count').notNull().default(0),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  index('receiptly_email_login_codes_email_created_idx').on(table.email, table.createdAt),
  index('receiptly_email_login_codes_expiry_idx').on(table.expiresAt),
]);

export const receiptlyProviderCredentials = pgTable('receiptly_provider_credentials', {
  id: id(),
  identityId: uuid('identity_id').notNull().references(() => receiptlyAuthIdentities.id, { onDelete: 'cascade' }),
  encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
  encryptionKeyVersion: varchar('encryption_key_version', { length: 40 }).notNull(),
  validatedAt: timestamp('validated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('receiptly_provider_credentials_identity_idx').on(table.identityId),
]);

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
}, (table) => [
  uniqueIndex('receiptly_household_members_household_user_idx').on(table.householdId, table.userId),
  index('receiptly_household_members_user_status_idx').on(table.userId, table.status),
]);

export const receiptlyStores = pgTable('receiptly_stores', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 160 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 160 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('receiptly_stores_household_normalized_name_idx').on(table.householdId, table.normalizedName),
]);

export const receiptlyProducts = pgTable('receiptly_products', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 300 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 300 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('receiptly_products_household_normalized_name_idx').on(table.householdId, table.normalizedName),
]);

export const receiptlyProductAliases = pgTable('receiptly_product_aliases', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => receiptlyProducts.id, { onDelete: 'cascade' }),
  rawName: varchar('raw_name', { length: 300 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 300 }).notNull(),
  source: lineSource('source').notNull().default('manual'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('receiptly_product_aliases_household_normalized_name_idx').on(
    table.householdId,
    table.normalizedName,
  ),
]);

export const receipts = pgTable('receiptly_receipts', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').notNull().references(() => receiptlyUsers.id),
  status: receiptStatus('status').notNull().default('draft'),
  entryMode: receiptEntryMode('entry_mode').notNull().default('manual'),
  // 客户端生成的 UUID；重复提交必须返回同一草稿，不能创建重复小票。
  clientDraftId: uuid('client_draft_id'),
  storeId: uuid('store_id').references(() => receiptlyStores.id),
  storeName: varchar('store_name', { length: 160 }),
  receiptNumber: varchar('receipt_number', { length: 160 }),
  purchasedOn: date('purchased_on'),
  purchasedAtLocal: varchar('purchased_at_local', { length: 16 }),
  totalCents: integer('total_cents'),
  currency: varchar('currency', { length: 3 }),
  scanProvider: varchar('scan_provider', { length: 80 }),
  scanModel: varchar('scan_model', { length: 160 }),
  version: integer('version').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('receiptly_receipts_creator_client_draft_idx').on(
    table.householdId,
    table.creatorId,
    table.clientDraftId,
  ),
  index('receiptly_receipts_home_lookup_idx').on(table.householdId, table.status, table.purchasedOn),
]);

export const receiptLines = pgTable('receiptly_receipt_lines', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull(),
  rawText: varchar('raw_text', { length: 500 }),
  displayName: varchar('display_name', { length: 300 }),
  productId: uuid('product_id').references(() => receiptlyProducts.id),
  quantity: numeric('quantity', { precision: 12, scale: 3 }),
  unit: varchar('unit', { length: 16 }),
  packValue: numeric('pack_value', { precision: 12, scale: 3 }),
  packUnit: varchar('pack_unit', { length: 12 }),
  unitPriceCents: integer('unit_price_cents'),
  unitPriceBasis: varchar('unit_price_basis', { length: 16 }),
  lineCents: integer('line_cents'),
  confidence: numeric('confidence', { precision: 4, scale: 3 }),
  source: lineSource('source').notNull().default('manual'),
  promotion: varchar('promotion', { length: 40 }).notNull().default('none'),
  status: lineStatus('status').notNull().default('included'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('receiptly_receipt_lines_receipt_sort_order_idx').on(table.receiptId, table.sortOrder),
  index('receiptly_receipt_lines_home_lookup_idx').on(table.receiptId, table.status),
  index('receiptly_receipt_lines_product_lookup_idx').on(table.householdId, table.productId, table.status),
]);

// 此处不保存原图或完整 OCR 文本，只记录重试与审计所需元数据。
export const receiptlyExtractionRuns = pgTable('receiptly_extraction_runs', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  receiptId: uuid('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 80 }).notNull(),
  model: varchar('model', { length: 160 }),
  status: extractionRunStatus('status').notNull(),
  attempt: integer('attempt').notNull().default(1),
  errorCode: varchar('error_code', { length: 80 }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  index('receiptly_extraction_runs_receipt_idx').on(table.receiptId, table.createdAt),
  index('receiptly_extraction_runs_status_idx').on(table.householdId, table.status, table.createdAt),
]);

export const receiptAdjustments = pgTable('receiptly_receipt_adjustments', {
  id: id(),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  type: adjustmentType('type').notNull(),
  amountCents: integer('amount_cents').notNull(),
  note: varchar('note', { length: 500 }),
  createdAt: createdAt(),
}, (table) => [
  index('receiptly_receipt_adjustments_receipt_idx').on(table.receiptId),
]);

export const receiptConfirmations = pgTable('receiptly_receipt_confirmations', {
  id: id(),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  receiptVersion: integer('receipt_version').notNull(),
  confirmedBy: uuid('confirmed_by').notNull().references(() => receiptlyUsers.id),
  totalsSnapshot: jsonb('totals_snapshot').notNull(),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex('receiptly_receipt_confirmations_receipt_version_idx').on(table.receiptId, table.receiptVersion),
  index('receiptly_receipt_confirmations_receipt_created_idx').on(table.receiptId, table.createdAt),
]);

export const auditEvents = pgTable('receiptly_audit_events', {
  id: id(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => receiptlyUsers.id),
  action: varchar('action', { length: 100 }).notNull(),
  objectType: varchar('object_type', { length: 80 }).notNull(),
  objectId: uuid('object_id').notNull(),
  changeSummary: jsonb('change_summary').notNull(),
  createdAt: createdAt(),
}, (table) => [
  index('receiptly_audit_events_household_created_idx').on(table.householdId, table.createdAt),
  index('receiptly_audit_events_object_idx').on(table.objectType, table.objectId, table.createdAt),
]);
