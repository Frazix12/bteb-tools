CREATE TYPE "public"."document_type" AS ENUM('index_sheet', 'cover_page');--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"type" "document_type" NOT NULL,
	"title" text NOT NULL,
	"data" jsonb NOT NULL,
	"logo_data_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_owner_updated_at_idx" ON "document" USING btree ("owner_id","updated_at" DESC NULLS LAST);