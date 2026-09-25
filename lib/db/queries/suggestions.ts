import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiSuggestions } from "@/lib/db/schema";

export async function createSuggestionRecord(input: {
  dossierId: string;
  etapa: "estrategia" | "argumentos";
  criadoPorId: string;
  respostaBruta: unknown;
}): Promise<void> {
  await db.insert(aiSuggestions).values({
    dossierId: input.dossierId,
    etapa: input.etapa,
    criadoPorId: input.criadoPorId,
    respostaBruta: input.respostaBruta,
  });
}

/**
 * Rate limit simples por usuário, mesmo padrão de countRecentImports (lib/db/
 * queries/imports.ts): conta linhas recentes na própria tabela.
 */
export async function countRecentSuggestions(criadoPorId: string, janelaMinutos = 60): Promise<number> {
  const desde = new Date(Date.now() - janelaMinutos * 60 * 1000).toISOString();
  const rows = await db
    .select({ id: aiSuggestions.id })
    .from(aiSuggestions)
    .where(and(eq(aiSuggestions.criadoPorId, criadoPorId), gte(aiSuggestions.criadoEm, desde)));
  return rows.length;
}
