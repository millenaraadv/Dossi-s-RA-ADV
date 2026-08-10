import {
  pgSchema,
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  date,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * Stub apontando para auth.users (gerenciada pelo Supabase Auth) — usado só
 * para a FK de users.id, nunca para consulta direta.
 */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const papelEnum = pgEnum("papel", [
  "socio",
  "advogado",
  "estagiario",
  "admin",
]);

export const materiaEnum = pgEnum("materia", [
  "Cível",
  "Trabalhista",
  "Tributário",
  "Empresarial",
  "Família e sucessões",
  "Consumidor",
]);

export const riscoEnum = pgEnum("risco", [
  "Favorável — êxito provável",
  "Favorável com reservas",
  "Incerto — prova em disputa",
  "Desfavorável — mitigar exposição",
  "A avaliar",
]);

export const firacLetraEnum = pgEnum("firac_letra", ["F", "I", "R", "A", "C"]);

export const importStatusEnum = pgEnum("import_status", [
  "lendo",
  "processando",
  "concluido",
  "erro",
]);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  papel: papelEnum("papel").notNull(),
  cor: text("cor"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}).enableRLS();

export const dossiers = pgTable(
  "dossiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cliente: text("cliente").notNull(),
    caso: text("caso").notNull(),
    numeroProcesso: text("numero_processo").notNull(),
    // Computado em código (computeDossierName) a cada escrita — nunca aceito no DTO de entrada.
    nome: text("nome").notNull(),
    materia: materiaEnum("materia").notNull(),
    fase: text("fase"),
    responsavelId: uuid("responsavel_id").references(() => users.id, { onDelete: "restrict" }),
    risco: riscoEnum("risco").notNull().default("A avaliar"),
    valorCausa: text("valor_causa"),
    orgao: text("orgao"),
    juiz: text("juiz"),
    partes: text("partes"),
    advogadoContrario: text("advogado_contrario"),
    resumo: text("resumo"),
    objetivo: text("objetivo"),
    objetivoSecundario: text("objetivo_secundario"),
    linhaVermelha: text("linha_vermelha"),
    versao: text("versao").notNull().default("v1"),
    marco: text("marco"),
    revisorId: uuid("revisor_id").references(() => users.id, { onDelete: "restrict" }),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    arquivado: boolean("arquivado").notNull().default(false),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("dossiers_nome_idx").on(t.nome),
    index("dossiers_responsavel_idx").on(t.responsavelId),
  ],
).enableRLS();

export const dossierFields = pgTable(
  "dossier_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    valor: text("valor").notNull(),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [index("dossier_fields_dossier_idx").on(t.dossierId)],
).enableRLS();

export const timelineEntries = pgTable(
  "timeline_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    // Os autos às vezes trazem data imprecisa — mantemos o texto original sempre,
    // e a coluna `data` só quando dá para interpretar sem ambiguidade.
    dataTexto: text("data_texto").notNull(),
    data: date("data"),
    ato: text("ato").notNull(),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [index("timeline_entries_dossier_idx").on(t.dossierId)],
).enableRLS();

export const firacBlocks = pgTable(
  "firac_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    letra: firacLetraEnum("letra").notNull(),
    paragrafo: text("paragrafo").notNull(),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [index("firac_blocks_dossier_idx").on(t.dossierId)],
).enableRLS();

export const steps = pgTable(
  "steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    acao: text("acao").notNull(),
    responsavelId: uuid("responsavel_id").references(() => users.id, { onDelete: "restrict" }),
    proximaData: date("proxima_data"),
    concluido: boolean("concluido").notNull().default(false),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("steps_dossier_idx").on(t.dossierId),
    index("steps_responsavel_idx").on(t.responsavelId),
    index("steps_proxima_data_abertos_idx")
      .on(t.proximaData)
      .where(sql`${t.concluido} = false`),
  ],
).enableRLS();

export const stepAttempts = pgTable(
  "step_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id").notNull().references(() => steps.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    resultado: text("resultado").notNull(),
    registradoPorId: uuid("registrado_por_id").references(() => users.id, { onDelete: "restrict" }),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("step_attempts_step_idx").on(t.stepId),
    index("step_attempts_data_idx").on(t.data),
  ],
).enableRLS();

export const deadlines = pgTable(
  "deadlines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    ato: text("ato").notNull(),
    contagem: text("contagem"),
    dataTexto: text("data_texto"),
    redacaoOk: boolean("redacao_ok").notNull().default(false),
    redacaoLink: text("redacao_link"),
    redacaoPorId: uuid("redacao_por_id").references(() => users.id, { onDelete: "restrict" }),
    redacaoEm: timestamp("redacao_em", { withTimezone: true, mode: "string" }),
    correcaoOk: boolean("correcao_ok").notNull().default(false),
    correcaoPorId: uuid("correcao_por_id").references(() => users.id, { onDelete: "restrict" }),
    correcaoEm: timestamp("correcao_em", { withTimezone: true, mode: "string" }),
    protocoloOk: boolean("protocolo_ok").notNull().default(false),
    protocoloData: date("protocolo_data"),
    protocoloPorId: uuid("protocolo_por_id").references(() => users.id, { onDelete: "restrict" }),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("deadlines_dossier_idx").on(t.dossierId)],
).enableRLS();

export const argumentsTable = pgTable(
  "arguments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    titulo: text("titulo").notNull(),
    fato: text("fato"),
    previsaoLegal: text("previsao_legal"),
    jurisprudencia: text("jurisprudencia"),
    doutrina: text("doutrina"),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [index("arguments_dossier_idx").on(t.dossierId)],
).enableRLS();

export const dossierVersions = pgTable(
  "dossier_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
    versao: text("versao").notNull(),
    data: date("data").notNull(),
    marco: text("marco"),
    revisorId: uuid("revisor_id").references(() => users.id, { onDelete: "restrict" }),
    etapa: text("etapa"),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("dossier_versions_dossier_idx").on(t.dossierId)],
).enableRLS();

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id").references(() => dossiers.id, { onDelete: "set null" }),
    arquivoNome: text("arquivo_nome").notNull(),
    arquivoStorageKey: text("arquivo_storage_key").notNull(),
    paginasLidas: integer("paginas_lidas"),
    status: importStatusEnum("status").notNull().default("lendo"),
    erro: text("erro"),
    camposFaltantes: jsonb("campos_faltantes").notNull().default(sql`'[]'::jsonb`),
    respostaBruta: jsonb("resposta_bruta"),
    criadoPorId: uuid("criado_por_id").references(() => users.id, { onDelete: "restrict" }),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("imports_dossier_idx").on(t.dossierId)],
).enableRLS();

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
    // Denormalizado a partir da entidade auditada — sem isso, listar "tudo que
    // mudou neste dossiê" exigiria juntar contra cada tabela filha por tipo.
    dossierId: uuid("dossier_id").references(() => dossiers.id, { onDelete: "cascade" }),
    entidade: text("entidade").notNull(),
    entidadeId: uuid("entidade_id").notNull(),
    acao: text("acao").notNull(),
    antes: jsonb("antes"),
    depois: jsonb("depois"),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entidade_idx").on(t.entidade, t.entidadeId),
    index("audit_log_dossier_idx").on(t.dossierId),
  ],
).enableRLS();

// Relações — só o necessário para as consultas aninhadas de `db.query.*`
// (GET de dossiê completo). `relationName` só onde há mais de uma FK entre
// o mesmo par de tabelas (dossiers↔users).

export const usersRelations = relations(users, ({ many }) => ({
  dossiersComoResponsavel: many(dossiers, { relationName: "dossier_responsavel" }),
  dossiersComoRevisor: many(dossiers, { relationName: "dossier_revisor" }),
}));

export const dossiersRelations = relations(dossiers, ({ one, many }) => ({
  responsavel: one(users, {
    fields: [dossiers.responsavelId],
    references: [users.id],
    relationName: "dossier_responsavel",
  }),
  revisor: one(users, {
    fields: [dossiers.revisorId],
    references: [users.id],
    relationName: "dossier_revisor",
  }),
  camposEspecificos: many(dossierFields),
  timeline: many(timelineEntries),
  firac: many(firacBlocks),
  passos: many(steps),
  prazos: many(deadlines),
  argumentos: many(argumentsTable),
  versoes: many(dossierVersions),
}));

export const dossierFieldsRelations = relations(dossierFields, ({ one }) => ({
  dossier: one(dossiers, { fields: [dossierFields.dossierId], references: [dossiers.id] }),
}));

export const timelineEntriesRelations = relations(timelineEntries, ({ one }) => ({
  dossier: one(dossiers, { fields: [timelineEntries.dossierId], references: [dossiers.id] }),
}));

export const firacBlocksRelations = relations(firacBlocks, ({ one }) => ({
  dossier: one(dossiers, { fields: [firacBlocks.dossierId], references: [dossiers.id] }),
}));

export const stepsRelations = relations(steps, ({ one, many }) => ({
  dossier: one(dossiers, { fields: [steps.dossierId], references: [dossiers.id] }),
  responsavel: one(users, { fields: [steps.responsavelId], references: [users.id] }),
  tentativas: many(stepAttempts),
}));

export const stepAttemptsRelations = relations(stepAttempts, ({ one }) => ({
  step: one(steps, { fields: [stepAttempts.stepId], references: [steps.id] }),
}));

export const deadlinesRelations = relations(deadlines, ({ one }) => ({
  dossier: one(dossiers, { fields: [deadlines.dossierId], references: [dossiers.id] }),
}));

export const argumentsTableRelations = relations(argumentsTable, ({ one }) => ({
  dossier: one(dossiers, { fields: [argumentsTable.dossierId], references: [dossiers.id] }),
}));

export const dossierVersionsRelations = relations(dossierVersions, ({ one }) => ({
  dossier: one(dossiers, { fields: [dossierVersions.dossierId], references: [dossiers.id] }),
  revisor: one(users, { fields: [dossierVersions.revisorId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  dossier: one(dossiers, { fields: [auditLog.dossierId], references: [dossiers.id] }),
  usuario: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));
