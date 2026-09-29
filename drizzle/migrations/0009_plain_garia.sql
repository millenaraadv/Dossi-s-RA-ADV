CREATE TYPE "public"."tipo_vinculo_processual" AS ENUM('conexao', 'agravo_instrumento', 'agravo_interno', 'recurso_especial', 'recurso_extraordinario', 'outro');--> statement-breakpoint
CREATE TABLE "process_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"tipo" "tipo_vinculo_processual" NOT NULL,
	"numero_processo" text,
	"tribunal_instancia" text,
	"status" text,
	"resumo" text,
	"resultado" text,
	"prazo_contagem" text,
	"prazo_data_texto" text,
	"prazo_data" date,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "process_links" ADD CONSTRAINT "process_links_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_links_dossier_idx" ON "process_links" USING btree ("dossier_id");