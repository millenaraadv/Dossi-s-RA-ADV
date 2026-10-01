import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { processLinkDeadlines, processLinks } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createDeadlineSchema, patchDeadlineSchema } from "@/lib/validation/deadline";

type CreateInput = z.infer<typeof createDeadlineSchema>;
type PatchInput = z.infer<typeof patchDeadlineSchema>;

export async function createProcessLinkDeadline(
  processLinkId: string,
  input: CreateInput,
  actorId: string,
  opcoes?: { viaIa?: boolean },
) {
  return db.transaction(async (tx) => {
    const [vinculo] = await tx.select().from(processLinks).where(eq(processLinks.id, processLinkId)).limit(1);
    if (!vinculo) throw new NotFoundError("Processo relacionado não encontrado.");

    const [{ proximaOrdem }] = await tx
      .select({ proximaOrdem: sql<number>`coalesce(max(${processLinkDeadlines.ordem}), -1) + 1` })
      .from(processLinkDeadlines)
      .where(eq(processLinkDeadlines.processLinkId, processLinkId));

    const [deadline] = await tx
      .insert(processLinkDeadlines)
      .values({
        processLinkId,
        ato: input.ato,
        contagem: input.contagem ?? null,
        dataTexto: input.dataTexto ?? null,
        ordem: proximaOrdem,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_deadlines",
      entidadeId: deadline.id,
      acao: "criar",
      depois: deadline,
      viaIa: opcoes?.viaIa ?? false,
    });

    return deadline;
  });
}

async function getDeadlineOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(processLinkDeadlines).where(eq(processLinkDeadlines.id, id)).limit(1);
  if (!row) throw new NotFoundError("Prazo não encontrado.");
  return row;
}

async function getProcessLinkOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(processLinks).where(eq(processLinks.id, id)).limit(1);
  if (!row) throw new NotFoundError("Processo relacionado não encontrado.");
  return row;
}

export async function updateProcessLinkDeadline(id: string, patch: PatchInput, actorId: string) {
  return db.transaction(async (tx) => {
    const antes = await getDeadlineOrThrow(tx, id);
    const agora = new Date().toISOString();

    const set: Record<string, unknown> = { ...patch };
    if ("redacaoOk" in patch) {
      set.redacaoPorId = actorId;
      set.redacaoEm = agora;
    }
    if ("correcaoOk" in patch || "correcaoPorId" in patch) {
      set.correcaoEm = agora;
    }
    if ("protocoloOk" in patch) {
      set.protocoloPorId = actorId;
    }

    await tx.update(processLinkDeadlines).set(set).where(eq(processLinkDeadlines.id, id));

    const depois = await getDeadlineOrThrow(tx, id);
    const vinculo = await getProcessLinkOrThrow(tx, antes.processLinkId);

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_deadlines",
      entidadeId: id,
      acao: "atualizar",
      antes,
      depois,
    });

    return depois;
  });
}

export async function deleteProcessLinkDeadline(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const antes = await getDeadlineOrThrow(tx, id);
    const vinculo = await getProcessLinkOrThrow(tx, antes.processLinkId);
    await tx.delete(processLinkDeadlines).where(eq(processLinkDeadlines.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_deadlines",
      entidadeId: id,
      acao: "excluir",
      antes,
    });
  });
}
