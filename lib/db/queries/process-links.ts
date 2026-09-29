import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { processLinks, dossiers } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { brDataParaIso } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createProcessLinkSchema, patchProcessLinkSchema } from "@/lib/validation/process-link";

type CreateInput = z.infer<typeof createProcessLinkSchema>;
type PatchInput = z.infer<typeof patchProcessLinkSchema>;

export async function createProcessLink(
  dossierId: string,
  input: CreateInput,
  actorId: string,
  opcoes?: { viaIa?: boolean },
) {
  return db.transaction(async (tx) => {
    const [dossier] = await tx.select().from(dossiers).where(eq(dossiers.id, dossierId)).limit(1);
    if (!dossier) throw new NotFoundError("Dossiê não encontrado.");

    const [{ proximaOrdem }] = await tx
      .select({ proximaOrdem: sql<number>`coalesce(max(${processLinks.ordem}), -1) + 1` })
      .from(processLinks)
      .where(eq(processLinks.dossierId, dossierId));

    const [vinculo] = await tx
      .insert(processLinks)
      .values({
        dossierId,
        tipo: input.tipo,
        numeroProcesso: input.numeroProcesso ?? null,
        tribunalInstancia: input.tribunalInstancia ?? null,
        status: input.status ?? null,
        resumo: input.resumo ?? null,
        resultado: input.resultado ?? null,
        prazoContagem: input.prazoContagem ?? null,
        prazoDataTexto: input.prazoDataTexto ?? null,
        prazoData: input.prazoDataTexto ? brDataParaIso(input.prazoDataTexto) : null,
        ordem: proximaOrdem,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId,
      entidade: "process_links",
      entidadeId: vinculo.id,
      acao: "criar",
      depois: vinculo,
      viaIa: opcoes?.viaIa ?? false,
    });

    return vinculo;
  });
}

async function getProcessLinkOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(processLinks).where(eq(processLinks.id, id)).limit(1);
  if (!row) throw new NotFoundError("Vínculo processual não encontrado.");
  return row;
}

export async function updateProcessLink(id: string, patch: PatchInput, actorId: string) {
  return db.transaction(async (tx) => {
    const antes = await getProcessLinkOrThrow(tx, id);

    const set: Record<string, unknown> = { ...patch, atualizadoEm: new Date().toISOString() };
    if ("prazoDataTexto" in patch) {
      set.prazoData = patch.prazoDataTexto ? brDataParaIso(patch.prazoDataTexto) : null;
    }

    await tx.update(processLinks).set(set).where(eq(processLinks.id, id));

    const depois = await getProcessLinkOrThrow(tx, id);

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "process_links",
      entidadeId: id,
      acao: "atualizar",
      antes,
      depois,
    });

    return depois;
  });
}

export async function deleteProcessLink(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const antes = await getProcessLinkOrThrow(tx, id);
    await tx.delete(processLinks).where(eq(processLinks.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "process_links",
      entidadeId: id,
      acao: "excluir",
      antes,
    });
  });
}
