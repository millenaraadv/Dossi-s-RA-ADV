import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { steps, stepAttempts, dossiers } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createStepSchema, patchStepSchema, createAttemptSchema } from "@/lib/validation/step";

type CreateStepInput = z.infer<typeof createStepSchema>;
type PatchStepInput = z.infer<typeof patchStepSchema>;
type CreateAttemptInput = z.infer<typeof createAttemptSchema>;

export async function createStep(dossierId: string, input: CreateStepInput, actorId: string) {
  return db.transaction(async (tx) => {
    const [dossier] = await tx.select().from(dossiers).where(eq(dossiers.id, dossierId)).limit(1);
    if (!dossier) throw new NotFoundError("Dossiê não encontrado.");

    const [{ proximaOrdem }] = await tx
      .select({ proximaOrdem: sql<number>`coalesce(max(${steps.ordem}), -1) + 1` })
      .from(steps)
      .where(eq(steps.dossierId, dossierId));

    const [step] = await tx
      .insert(steps)
      .values({
        dossierId,
        acao: input.acao,
        responsavelId: input.responsavelId ?? null,
        proximaData: input.proximaData ?? null,
        ordem: proximaOrdem,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId,
      entidade: "steps",
      entidadeId: step.id,
      acao: "criar",
      depois: step,
    });

    return step;
  });
}

async function getStepOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(steps).where(eq(steps.id, id)).limit(1);
  if (!row) throw new NotFoundError("Passo não encontrado.");
  return row;
}

export async function updateStep(id: string, patch: PatchStepInput, actorId: string) {
  return db.transaction(async (tx) => {
    const antes = await getStepOrThrow(tx, id);

    await tx
      .update(steps)
      .set({ ...patch, atualizadoEm: new Date().toISOString() })
      .where(eq(steps.id, id));

    const depois = await getStepOrThrow(tx, id);

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "steps",
      entidadeId: id,
      acao: "atualizar",
      antes,
      depois,
    });

    return depois;
  });
}

export async function deleteStep(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const antes = await getStepOrThrow(tx, id);
    await tx.delete(steps).where(eq(steps.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "steps",
      entidadeId: id,
      acao: "excluir",
      antes,
    });
  });
}

export async function addAttempt(stepId: string, input: CreateAttemptInput, actorId: string) {
  return db.transaction(async (tx) => {
    const step = await getStepOrThrow(tx, stepId);

    const [attempt] = await tx
      .insert(stepAttempts)
      .values({
        stepId,
        data: input.data,
        resultado: input.resultado,
        registradoPorId: actorId,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId: step.dossierId,
      entidade: "step_attempts",
      entidadeId: attempt.id,
      acao: "criar",
      depois: attempt,
    });

    return attempt;
  });
}
