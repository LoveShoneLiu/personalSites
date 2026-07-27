-- 文件职责：增加家庭邀请、邀请码查询限流，以及单用户单有效家庭约束。
CREATE TABLE "receiptly_household_invitation_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiptly_household_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"invited_email" varchar(320) NOT NULL,
	"code_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receiptly_household_invitations_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "receiptly_household_invitation_attempts" ADD CONSTRAINT "receiptly_household_invitation_attempts_user_id_receiptly_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."receiptly_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_household_invitations" ADD CONSTRAINT "receiptly_household_invitations_household_id_receiptly_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."receiptly_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_household_invitations" ADD CONSTRAINT "receiptly_household_invitations_invited_by_receiptly_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."receiptly_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiptly_household_invitations" ADD CONSTRAINT "receiptly_household_invitations_accepted_by_receiptly_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."receiptly_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receiptly_household_invitation_attempts_user_created_idx" ON "receiptly_household_invitation_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_household_invitations_active_email_idx" ON "receiptly_household_invitations" USING btree ("household_id","invited_email") WHERE "receiptly_household_invitations"."accepted_at" IS NULL AND "receiptly_household_invitations"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "receiptly_household_invitations_owner_created_idx" ON "receiptly_household_invitations" USING btree ("invited_by","created_at");--> statement-breakpoint
CREATE INDEX "receiptly_household_invitations_expiry_idx" ON "receiptly_household_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receiptly_household_members_one_active_household_idx" ON "receiptly_household_members" USING btree ("user_id") WHERE "receiptly_household_members"."status" = 'active';
