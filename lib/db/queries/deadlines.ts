import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deadlines, dossiers } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createDeadlineSchema, patchDeadlineSchema } from "@/lib/validation/deadline";

type CreateInput = z.infer<typeof createDeadlineSchema>;
type PatchInput = z.infer<typeof patchDeadlineSchema>;

export async function createDeadline(dossierId: string, input: CreateInput, actorId: string) {
  return db.transaction(async (tx) => {
    const [dossier] = await tx.select().from(dossiers).where(eq(dossiers.id, dossierId)).limit(1);
    if (!dossier) throw new NotFoundError("Dossiê não encontrado.");

    const [{ proximaOrdem }] = await tx
      .select({ proximaOrdem: sql<number>`coalesce(max(${deadlines.ordem}), -1) + 1` })
      .from(deadlines)
      .where(eq(deadlines.dossierId, dossierId));

    const [deadline] = await tx
      .insert(deadlines)
      .values({
        dossierId,
        ato: input.ato,
        contagem: input.contagem ?? null,
        dataTexto: input.dataTexto ?? null,
        ordem: proximaOrdem,
      })
      .returning();

    await audit(tx, {
      userId: actorId,
      dossierId,
      entidade: "deadlines",
      entidadeId: deadline.id,
      acao: "criar",
      depois: deadline,
    });

    return deadline;
  });
}

async function getDeadlineOrThrow(tx: Pick<typeof db, "select">, id: string) {
  const [row] = await tx.select().from(deadlines).where(eq(deadlines.id, id)).limit(1);
  if (!row) throw new NotFoundError("Prazo não encontrado.");
  return row;
}

export async function updateDeadline(id: string, patch: PatchInput, actorId: string) {
  return db.transaction(async (tx) => {
    const antes = await getDeadlineOrThrow(tx, id);
    const agora = new Date().toISOString();

    // redação/protocolo: quem marcou é sempre quem clicou (automático).
    // correção: "quem corrigiu" é escolha manual (select), não quem clicou.
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

    await tx.update(deadlines).set(set).where(eq(deadlines.id, id));

    const depois = await getDeadlineOrThrow(tx, id);

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "deadlines",
      entidadeId: id,
      acao: "atualizar",
      antes,
      depois,
    });

    return depois;
  });
}

export async function deleteDeadline(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const antes = await getDeadlineOrThrow(tx, id);
    await tx.delete(deadlines).where(eq(deadlines.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "deadlines",
      entidadeId: id,
      acao: "excluir",
      antes,
    });
  });
}
