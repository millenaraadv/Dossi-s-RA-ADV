import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { imports } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";

export async function createImportRecord(input: {
  arquivoNome: string;
  arquivoStorageKey: string;
  criadoPorId: string;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(imports)
    .values({
      arquivoNome: input.arquivoNome,
      arquivoStorageKey: input.arquivoStorageKey,
      criadoPorId: input.criadoPorId,
      status: "lendo",
    })
    .returning({ id: imports.id });
  return row;
}

export async function getImport(id: string) {
  const [row] = await db.select().from(imports).where(eq(imports.id, id)).limit(1);
  if (!row) throw new NotFoundError("Importação não encontrada.");
  return row;
}

export async function updateImportStatus(
  id: string,
  patch: Partial<{
    status: "lendo" | "processando" | "concluido" | "erro";
    erro: string | null;
    camposFaltantes: string[];
    respostaBruta: unknown;
    paginasLidas: number | null;
    dossierId: string | null;
  }>,
): Promise<void> {
  await db.update(imports).set(patch).where(eq(imports.id, id));
}

/**
 * Limite simples por usuário (README: "rate limit simples ... sem Redis, não
 * é necessário para 6 usuários") — conta linhas recentes na própria tabela
 * imports em vez de manter contador à parte.
 */
export async function countRecentImports(criadoPorId: string, janelaMinutos = 60): Promise<number> {
  const desde = new Date(Date.now() - janelaMinutos * 60 * 1000).toISOString();
  const rows = await db
    .select({ id: imports.id })
    .from(imports)
    .where(and(eq(imports.criadoPorId, criadoPorId), gte(imports.criadoEm, desde)));
  return rows.length;
}
