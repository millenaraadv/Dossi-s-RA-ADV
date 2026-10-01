CREATE TABLE "process_link_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid NOT NULL,
	"label" text NOT NULL,
	"valor" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "process_link_fields" ADD CONSTRAINT "process_link_fields_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_link_fields_process_link_idx" ON "process_link_fields" USING btree ("process_link_id");