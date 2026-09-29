import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { processLinkImports } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";

export async function createProcessLinkImportRecord(input: {
  processLinkId: string;
  arquivoNome: string;
  arquivoStorageKey: string;
  criadoPorId: string;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(processLinkImports)
    .values({
      processLinkId: input.processLinkId,
      arquivoNome: input.arquivoNome,
      arquivoStorageKey: input.arquivoStorageKey,
      criadoPorId: input.criadoPorId,
      status: "lendo",
    })
    .returning({ id: processLinkImports.id });
  return row;
}

export async function getProcessLinkImport(id: string) {
  const [row] = await db.select().from(processLinkImports).where(eq(processLinkImports.id, id)).limit(1);
  if (!row) throw new NotFoundError("Importação não encontrada.");
  return row;
}

export async function updateProcessLinkImportStatus(
  id: string,
  patch: Partial<{
    status: "lendo" | "processando" | "concluido" | "erro";
    erro: string | null;
    camposFaltantes: string[];
    respostaBruta: unknown;
    paginasLidas: number | null;
  }>,
): Promise<void> {
  await db.update(processLinkImports).set(patch).where(eq(processLinkImports.id, id));
}

/** Mesmo padrão de countRecentImports (lib/db/queries/imports.ts), contador próprio. */
export async function countRecentProcessLinkImports(criadoPorId: string, janelaMinutos = 60): Promise<number> {
  const desde = new Date(Date.now() - janelaMinutos * 60 * 1000).toISOString();
  const rows = await db
    .select({ id: processLinkImports.id })
    .from(processLinkImports)
    .where(and(eq(processLinkImports.criadoPorId, criadoPorId), gte(processLinkImports.criadoEm, desde)));
  return rows.length;
}
