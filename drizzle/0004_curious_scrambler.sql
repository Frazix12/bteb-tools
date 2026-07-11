CREATE TYPE "public"."ai_key_validation_status" AS ENUM('unchecked', 'valid', 'invalid', 'transient_failure');--> statement-breakpoint
CREATE TABLE "ai_key_rotation_state" (
	"provider" text PRIMARY KEY NOT NULL,
	"cursor" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_key_rotation_state_cursor_non_negative" CHECK ("ai_key_rotation_state"."cursor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_provider_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"fingerprint" text NOT NULL,
	"masked_suffix" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"validation_status" "ai_key_validation_status" DEFAULT 'unchecked' NOT NULL,
	"cooldown_until" timestamp with time zone,
	"last_validated_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"last_failure_code" text,
	"last_failure_message" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_key_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
ALTER TABLE "ai_provider_key" ADD CONSTRAINT "ai_provider_key_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_provider_key" ADD CONSTRAINT "ai_provider_key_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_provider_key_provider_eligibility_idx" ON "ai_provider_key" USING btree ("provider","enabled","validation_status","cooldown_until");--> statement-breakpoint
CREATE INDEX "ai_provider_key_provider_last_used_idx" ON "ai_provider_key" USING btree ("provider","last_used_at");