-- 文件职责：扩展统一认证模型，增加登录身份、挑战、验证码和可轮换会话结构。
CREATE TYPE "public"."receiptly_auth_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TYPE "public"."receiptly_auth_provider" AS ENUM('google', 'apple', 'email');--> statement-breakpoint
CREATE TYPE "public"."receiptly_user_status" AS ENUM('active', 'deletion_pending', 'deleted');--> statement-breakpoint
CREATE TABLE "receiptly_auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "receiptly_auth_provider" NOT NULL,
	"raw_nonce" varchar(128) NOT NULL,
	"state_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "receiptly_auth_provider" NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"provider_email" varchar(320),
	"provider_email_verified_at" timestamp with time zone,
	"profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "receiptly_email_login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"code_hash" text NOT NULL,
	"installation_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_provider_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"encryption_key_version" varchar(40) NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receiptly_users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_users" ALTER COLUMN "display_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "token_family_id" uuid;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "rotated_from_session_id" uuid;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "installation_id" uuid;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "device_name" varchar(160);--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "platform" "receiptly_auth_platform";--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "last_used_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ADD COLUMN "revoke_reason" varchar(80);--> statement-breakpoint
UPDATE "receiptly_sessions"
SET
  "token_family_id" = "id",
  "installation_id" = "id",
  "platform" = 'web',
  "revoked_at" = COALESCE("revoked_at", now()),
  "revoke_reason" = COALESCE("revoke_reason", 'legacy_session_migration');--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ALTER COLUMN "token_family_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ALTER COLUMN "installation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_sessions" ALTER COLUMN "platform" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_users" ADD COLUMN "status" "receiptly_user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "receiptly_users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "receiptly_auth_identities" ADD CONSTRAINT "receiptly_auth_identities_user_id_receiptly_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."receiptly_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_provider_credentials" ADD CONSTRAINT "receiptly_provider_credentials_identity_id_receiptly_auth_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."receiptly_auth_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receiptly_auth_challenges_expiry_idx" ON "receiptly_auth_challenges" USING btree ("provider","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_auth_identities_provider_subject_idx" ON "receiptly_auth_identities" USING btree ("provider","provider_subject");--> statement-breakpoint
CREATE INDEX "receiptly_auth_identities_user_idx" ON "receiptly_auth_identities" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "receiptly_email_login_codes_email_created_idx" ON "receiptly_email_login_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "receiptly_email_login_codes_expiry_idx" ON "receiptly_email_login_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_provider_credentials_identity_idx" ON "receiptly_provider_credentials" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "receiptly_sessions_family_idx" ON "receiptly_sessions" USING btree ("token_family_id","revoked_at");
