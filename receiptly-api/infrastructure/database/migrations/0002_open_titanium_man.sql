-- 文件职责：为邮箱密码登录增加失败次数统计和临时锁定字段。
ALTER TABLE "receiptly_users" ADD COLUMN "password_failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "receiptly_users" ADD COLUMN "password_locked_until" timestamp with time zone;
