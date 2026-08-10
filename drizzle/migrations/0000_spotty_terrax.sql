CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."firac_letra" AS ENUM('F', 'I', 'R', 'A', 'C');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('lendo', 'processando', 'concluido', 'erro');--> statement-breakpoint
CREATE TYPE "public"."materia" AS ENUM('Cível', 'Trabalhista', 'Tributário', 'Empresarial', 'Família e sucessões', 'Consumidor');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('socio', 'advogado', 'estagiario', 'admin');--> statement-breakpoint
CREATE TYPE "public"."risco" AS ENUM('Favorável — êxito provável', 'Favorável com reservas', 'Incerto — prova em disputa', 'Desfavorável — mitigar exposição', 'A avaliar');--> statement-breakpoint
CREATE TABLE "arguments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"titulo" text NOT NULL,
	"fato" text,
	"previsao_legal" text,
	"jurisprudencia" text,
	"doutrina" text,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"entidade" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"antes" jsonb,
	"depois" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"ato" text NOT NULL,
	"contagem" text,
	"data_texto" text,
	"redacao_ok" boolean DEFAULT false NOT NULL,
	"redacao_link" text,
	"redacao_por_id" uuid,
	"redacao_em" timestamp with time zone,
	"correcao_ok" boolean DEFAULT false NOT NULL,
	"correcao_por_id" uuid,
	"correcao_em" timestamp with time zone,
	"protocolo_ok" boolean DEFAULT false NOT NULL,
	"protocolo_data" date,
	"protocolo_por_id" uuid,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossier_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"label" text NOT NULL,
	"valor" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossier_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"versao" text NOT NULL,
	"data" date NOT NULL,
	"marco" text,
	"revisor_id" uuid,
	"etapa" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente" text NOT NULL,
	"caso" text NOT NULL,
	"numero_processo" text NOT NULL,
	"nome" text NOT NULL,
	"materia" "materia" NOT NULL,
	"fase" text,
	"responsavel_id" uuid,
	"risco" "risco" DEFAULT 'A avaliar' NOT NULL,
	"valor_causa" text,
	"orgao" text,
	"juiz" text,
	"partes" text,
	"advogado_contrario" text,
	"resumo" text,
	"objetivo" text,
	"objetivo_secundario" text,
	"linha_vermelha" text,
	"versao" text DEFAULT 'v1' NOT NULL,
	"marco" text,
	"revisor_id" uuid,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firac_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"letra" "firac_letra" NOT NULL,
	"paragrafo" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid,
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
CREATE TABLE "step_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"data" date NOT NULL,
	"resultado" text NOT NULL,
	"registrado_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"responsavel_id" uuid,
	"proxima_data" date,
	"concluido" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"data_texto" text NOT NULL,
	"data" date,
	"ato" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"papel" "papel" NOT NULL,
	"cor" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "arguments" ADD CONSTRAINT "arguments_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_redacao_por_id_users_id_fk" FOREIGN KEY ("redacao_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_correcao_por_id_users_id_fk" FOREIGN KEY ("correcao_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_protocolo_por_id_users_id_fk" FOREIGN KEY ("protocolo_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_fields" ADD CONSTRAINT "dossier_fields_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_versions" ADD CONSTRAINT "dossier_versions_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_versions" ADD CONSTRAINT "dossier_versions_revisor_id_users_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_revisor_id_users_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firac_blocks" ADD CONSTRAINT "firac_blocks_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_attempts" ADD CONSTRAINT "step_attempts_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_attempts" ADD CONSTRAINT "step_attempts_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arguments_dossier_idx" ON "arguments" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "audit_log_entidade_idx" ON "audit_log" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE INDEX "deadlines_dossier_idx" ON "deadlines" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "dossier_fields_dossier_idx" ON "dossier_fields" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "dossier_versions_dossier_idx" ON "dossier_versions" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "dossiers_nome_idx" ON "dossiers" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "dossiers_responsavel_idx" ON "dossiers" USING btree ("responsavel_id");--> statement-breakpoint
CREATE INDEX "firac_blocks_dossier_idx" ON "firac_blocks" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "imports_dossier_idx" ON "imports" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "step_attempts_step_idx" ON "step_attempts" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "step_attempts_data_idx" ON "step_attempts" USING btree ("data");--> statement-breakpoint
CREATE INDEX "steps_dossier_idx" ON "steps" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "steps_responsavel_idx" ON "steps" USING btree ("responsavel_id");--> statement-breakpoint
CREATE INDEX "steps_proxima_data_abertos_idx" ON "steps" USING btree ("proxima_data") WHERE "steps"."concluido" = false;--> statement-breakpoint
CREATE INDEX "timeline_entries_dossier_idx" ON "timeline_entries" USING btree ("dossier_id");