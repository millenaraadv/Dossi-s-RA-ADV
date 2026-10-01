import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { processLinkSteps, processLinkStepAttempts, processLinks } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createStepSchema, patchStepSchema, createAttemptSchema } from "@/lib/validation/step";

type CreateStepInput = z.infer<typeof createStepSchema>;
type PatchStepInput = z.infer<typeof patchStepSchema>;
type CreateAttemptInput = z.infer<typeof createAttemptSchema>;

export async function createProcessLinkStep(
  processLinkId: string,
  input: CreateStepInput,
  actorId: string,
  opcoes?: { viaIa?: boolean },
) {
  return db.transaction(async (tx) => {
    const [vinculo] = await tx.select().from(processLinks).where(eq(processLinks.id, processLinkId)).limit(1);
    if (!vinculo) throw new NotFoundError("Processo relacionado não encontrado.");

    const [{ proximaOrdem }] = await tx
      .select({ proximaOrdem: sql<number>`coalesce(max(${processLinkSteps.ordem}), -1) + 1` })
      .from(processLinkSteps)
      .where(eq(processLinkSteps.processLinkId, processLinkId));

    const [step] = await tx
      .insert(processLinkSteps)
      .values({
        processLinkId,
        acao: input.acao,
        responsavelId: input.responsavelId ?? null,
        proximaData: input.proximaData ?? null,
        ordem: proximaOrdem,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_steps",
      entidadeId: step.id,
      acao: "criar",
      depois: step,
      viaIa: opcoes?.viaIa ?? false,
    });

    return step;
  });
}

async function getStepOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(processLinkSteps).where(eq(processLinkSteps.id, id)).limit(1);
  if (!row) throw new NotFoundError("Passo não encontrado.");
  return row;
}

async function getProcessLinkOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(processLinks).where(eq(processLinks.id, id)).limit(1);
  if (!row) throw new NotFoundError("Processo relacionado não encontrado.");
  return row;
}

export async function updateProcessLinkStep(id: string, patch: PatchStepInput, actorId: string) {
  return db.transaction(async (tx) => {
    const antes = await getStepOrThrow(tx, id);

    await tx
      .update(processLinkSteps)
      .set({ ...patch, atualizadoEm: new Date().toISOString() })
      .where(eq(processLinkSteps.id, id));

    const depois = await getStepOrThrow(tx, id);
    const vinculo = await getProcessLinkOrThrow(tx, antes.processLinkId);

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_steps",
      entidadeId: id,
      acao: "atualizar",
      antes,
      depois,
    });

    return depois;
  });
}

export async function deleteProcessLinkStep(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const antes = await getStepOrThrow(tx, id);
    const vinculo = await getProcessLinkOrThrow(tx, antes.processLinkId);
    await tx.delete(processLinkSteps).where(eq(processLinkSteps.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_steps",
      entidadeId: id,
      acao: "excluir",
      antes,
    });
  });
}

export async function addProcessLinkStepAttempt(stepId: string, input: CreateAttemptInput, actorId: string) {
  return db.transaction(async (tx) => {
    const step = await getStepOrThrow(tx, stepId);
    const vinculo = await getProcessLinkOrThrow(tx, step.processLinkId);

    const [attempt] = await tx
      .insert(processLinkStepAttempts)
      .values({
        stepId,
        data: input.data,
        resultado: input.resultado,
        registradoPorId: actorId,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_step_attempts",
      entidadeId: attempt.id,
      acao: "criar",
      depois: attempt,
    });

    return attempt;
  });
}
