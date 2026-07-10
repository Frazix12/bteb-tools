CREATE TABLE "autofill_rate_limit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "autofill_rate_limit" ADD CONSTRAINT "autofill_rate_limit_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autofill_rate_limit_owner_attempted_at_idx" ON "autofill_rate_limit" USING btree ("owner_id","attempted_at");