CREATE TABLE "process_link_arguments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"titulo" text NOT NULL,
	"fato" text,
	"previsao_legal" text,
	"jurisprudencia" text,
	"doutrina" text,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_arguments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "process_link_firac" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid NOT NULL,
	"letra" "firac_letra" NOT NULL,
	"paragrafo" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_firac" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "process_link_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid,
	"arquivo_nome" text NOT NULL,
	"arquivo_storage_key" text NOT NULL,
	"paginas_lidas" integer,
	"status" "import_status" DEFAULT 'lendo' NOT NULL,
	"erro" text,
	"campos_faltantes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resposta_bruta" jsonb,
	"criado_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "process_links" ADD COLUMN "partes" text;--> statement-breakpoint
ALTER TABLE "process_links" ADD COLUMN "juiz" text;--> statement-breakpoint
ALTER TABLE "process_links" ADD COLUMN "fase" text;--> statement-breakpoint
ALTER TABLE "process_links" ADD COLUMN "valor_causa" text;--> statement-breakpoint
ALTER TABLE "process_link_arguments" ADD CONSTRAINT "process_link_arguments_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_firac" ADD CONSTRAINT "process_link_firac_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_imports" ADD CONSTRAINT "process_link_imports_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_imports" ADD CONSTRAINT "process_link_imports_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_link_arguments_process_link_idx" ON "process_link_arguments" USING btree ("process_link_id");--> statement-breakpoint
CREATE INDEX "process_link_firac_process_link_idx" ON "process_link_firac" USING btree ("process_link_id");--> statement-breakpoint
CREATE INDEX "process_link_imports_process_link_idx" ON "process_link_imports" USING btree ("process_link_id");