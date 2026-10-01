CREATE TABLE "process_link_timeline_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid NOT NULL,
	"data_texto" text NOT NULL,
	"data" date,
	"ato" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_timeline_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "process_links" ADD COLUMN "advogado_contrario" text;--> statement-breakpoint
ALTER TABLE "process_links" ADD COLUMN "risco" "risco" DEFAULT 'A avaliar' NOT NULL;--> statement-breakpoint
ALTER TABLE "process_link_timeline_entries" ADD CONSTRAINT "process_link_timeline_entries_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_link_timeline_process_link_idx" ON "process_link_timeline_entries" USING btree ("process_link_id");