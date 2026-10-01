CREATE TABLE "process_link_deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid NOT NULL,
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
ALTER TABLE "process_link_deadlines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "process_link_step_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"data" date NOT NULL,
	"resultado" text NOT NULL,
	"registrado_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_step_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "process_link_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_link_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"responsavel_id" uuid,
	"proxima_data" date,
	"concluido" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_link_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "process_link_deadlines" ADD CONSTRAINT "process_link_deadlines_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_deadlines" ADD CONSTRAINT "process_link_deadlines_redacao_por_id_users_id_fk" FOREIGN KEY ("redacao_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_deadlines" ADD CONSTRAINT "process_link_deadlines_correcao_por_id_users_id_fk" FOREIGN KEY ("correcao_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_deadlines" ADD CONSTRAINT "process_link_deadlines_protocolo_por_id_users_id_fk" FOREIGN KEY ("protocolo_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_step_attempts" ADD CONSTRAINT "process_link_step_attempts_step_id_process_link_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."process_link_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_step_attempts" ADD CONSTRAINT "process_link_step_attempts_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_steps" ADD CONSTRAINT "process_link_steps_process_link_id_process_links_id_fk" FOREIGN KEY ("process_link_id") REFERENCES "public"."process_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_link_steps" ADD CONSTRAINT "process_link_steps_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_link_deadlines_process_link_idx" ON "process_link_deadlines" USING btree ("process_link_id");--> statement-breakpoint
CREATE INDEX "process_link_step_attempts_step_idx" ON "process_link_step_attempts" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "process_link_step_attempts_data_idx" ON "process_link_step_attempts" USING btree ("data");--> statement-breakpoint
CREATE INDEX "process_link_steps_process_link_idx" ON "process_link_steps" USING btree ("process_link_id");--> statement-breakpoint
CREATE INDEX "process_link_steps_responsavel_idx" ON "process_link_steps" USING btree ("responsavel_id");