CREATE TYPE "public"."receiptly_adjustment_type" AS ENUM('discount', 'refund', 'tax', 'non_item_fee', 'other');--> statement-breakpoint
CREATE TYPE "public"."receiptly_extraction_run_status" AS ENUM('processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."receiptly_household_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."receiptly_line_source" AS ENUM('ai', 'manual');--> statement-breakpoint
CREATE TYPE "public"."receiptly_line_status" AS ENUM('included', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."receiptly_membership_status" AS ENUM('active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."receiptly_receipt_entry_mode" AS ENUM('manual', 'scan');--> statement-breakpoint
CREATE TYPE "public"."receiptly_receipt_status" AS ENUM('draft', 'processing', 'needs_review', 'confirmed', 'deleted');--> statement-breakpoint
CREATE TABLE "receiptly_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"object_type" varchar(80) NOT NULL,
	"object_id" uuid NOT NULL,
	"change_summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "receiptly_household_role" NOT NULL,
	"status" "receiptly_membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Pacific/Auckland' NOT NULL,
	"currency" varchar(3) DEFAULT 'NZD' NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "receiptly_receipt_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"type" "receiptly_adjustment_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_receipt_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"receipt_version" integer NOT NULL,
	"confirmed_by" uuid NOT NULL,
	"totals_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_receipt_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"receipt_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"raw_text" varchar(500),
	"display_name" varchar(300),
	"product_id" uuid,
	"quantity" numeric(12, 3),
	"unit" varchar(16),
	"pack_value" numeric(12, 3),
	"pack_unit" varchar(12),
	"unit_price_cents" integer,
	"unit_price_basis" varchar(16),
	"line_cents" integer,
	"confidence" numeric(4, 3),
	"source" "receiptly_line_source" DEFAULT 'manual' NOT NULL,
	"promotion" varchar(40) DEFAULT 'none' NOT NULL,
	"status" "receiptly_line_status" DEFAULT 'included' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"receipt_id" uuid,
	"provider" varchar(80) NOT NULL,
	"model" varchar(160),
	"status" "receiptly_extraction_run_status" NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"error_code" varchar(80),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_product_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"raw_name" varchar(300) NOT NULL,
	"normalized_name" varchar(300) NOT NULL,
	"source" "receiptly_line_source" DEFAULT 'manual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"display_name" varchar(300) NOT NULL,
	"normalized_name" varchar(300) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receiptly_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE "receiptly_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"normalized_name" varchar(160) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "receiptly_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "receiptly_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"status" "receiptly_receipt_status" DEFAULT 'draft' NOT NULL,
	"entry_mode" "receiptly_receipt_entry_mode" DEFAULT 'manual' NOT NULL,
	"client_draft_id" uuid,
	"store_id" uuid,
	"store_name" varchar(160),
	"receipt_number" varchar(160),
	"purchased_on" date,
	"purchased_at_local" varchar(16),
	"total_cents" integer,
	"currency" varchar(3),
	"scan_provider" varchar(80),
	"scan_model" varchar(160),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "receiptly_audit_events" ADD CONSTRAINT "receiptly_audit_events_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_audit_events" ADD CONSTRAINT "receiptly_audit_events_actor_id_receiptly_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."receiptly_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_household_members" ADD CONSTRAINT "receiptly_household_members_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_household_members" ADD CONSTRAINT "receiptly_household_members_user_id_receiptly_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."receiptly_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_households" ADD CONSTRAINT "receiptly_households_owner_user_id_receiptly_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."receiptly_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipt_adjustments" ADD CONSTRAINT "receiptly_receipt_adjustments_receipt_id_receiptly_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receiptly_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipt_confirmations" ADD CONSTRAINT "receiptly_receipt_confirmations_receipt_id_receiptly_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receiptly_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipt_confirmations" ADD CONSTRAINT "receiptly_receipt_confirmations_confirmed_by_receiptly_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."receiptly_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipt_lines" ADD CONSTRAINT "receiptly_receipt_lines_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipt_lines" ADD CONSTRAINT "receiptly_receipt_lines_receipt_id_receiptly_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receiptly_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipt_lines" ADD CONSTRAINT "receiptly_receipt_lines_product_id_receiptly_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."receiptly_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_extraction_runs" ADD CONSTRAINT "receiptly_extraction_runs_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_extraction_runs" ADD CONSTRAINT "receiptly_extraction_runs_receipt_id_receiptly_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receiptly_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_product_aliases" ADD CONSTRAINT "receiptly_product_aliases_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_product_aliases" ADD CONSTRAINT "receiptly_product_aliases_product_id_receiptly_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."receiptly_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_products" ADD CONSTRAINT "receiptly_products_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD CONSTRAINT "receiptly_sessions_user_id_receiptly_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."receiptly_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_stores" ADD CONSTRAINT "receiptly_stores_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipts" ADD CONSTRAINT "receiptly_receipts_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipts" ADD CONSTRAINT "receiptly_receipts_creator_id_receiptly_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."receiptly_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_receipts" ADD CONSTRAINT "receiptly_receipts_store_id_receiptly_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."receiptly_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receiptly_audit_events_household_created_idx" ON "receiptly_audit_events" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "receiptly_audit_events_object_idx" ON "receiptly_audit_events" USING btree ("object_type","object_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_household_members_household_user_idx" ON "receiptly_household_members" USING btree ("household_id","user_id");--> statement-breakpoint
CREATE INDEX "receiptly_household_members_user_status_idx" ON "receiptly_household_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "receiptly_receipt_adjustments_receipt_idx" ON "receiptly_receipt_adjustments" USING btree ("receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_receipt_confirmations_receipt_version_idx" ON "receiptly_receipt_confirmations" USING btree ("receipt_id","receipt_version");--> statement-breakpoint
CREATE INDEX "receiptly_receipt_confirmations_receipt_created_idx" ON "receiptly_receipt_confirmations" USING btree ("receipt_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_receipt_lines_receipt_sort_order_idx" ON "receiptly_receipt_lines" USING btree ("receipt_id","sort_order");--> statement-breakpoint
CREATE INDEX "receiptly_receipt_lines_home_lookup_idx" ON "receiptly_receipt_lines" USING btree ("receipt_id","status");--> statement-breakpoint
CREATE INDEX "receiptly_receipt_lines_product_lookup_idx" ON "receiptly_receipt_lines" USING btree ("household_id","product_id","status");--> statement-breakpoint
CREATE INDEX "receiptly_extraction_runs_receipt_idx" ON "receiptly_extraction_runs" USING btree ("receipt_id","created_at");--> statement-breakpoint
CREATE INDEX "receiptly_extraction_runs_status_idx" ON "receiptly_extraction_runs" USING btree ("household_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_product_aliases_household_normalized_name_idx" ON "receiptly_product_aliases" USING btree ("household_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_products_household_normalized_name_idx" ON "receiptly_products" USING btree ("household_id","normalized_name");--> statement-breakpoint
CREATE INDEX "receiptly_sessions_user_expiry_idx" ON "receiptly_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_stores_household_normalized_name_idx" ON "receiptly_stores" USING btree ("household_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_receipts_creator_client_draft_idx" ON "receiptly_receipts" USING btree ("household_id","creator_id","client_draft_id");--> statement-breakpoint
CREATE INDEX "receiptly_receipts_home_lookup_idx" ON "receiptly_receipts" USING btree ("household_id","status","purchased_on");