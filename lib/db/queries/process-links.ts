import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { processLinks, processLinkFirac, processLinkArguments, dossiers } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { brDataParaIso } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createProcessLinkSchema, patchProcessLinkSchema } from "@/lib/validation/process-link";
import type { firacReplaceSchema, argumentsReplaceSchema } from "@/lib/validation/dossier";

type CreateInput = z.infer<typeof createProcessLinkSchema>;
type PatchInput = z.infer<typeof patchProcessLinkSchema>;
type FiracInput = z.infer<typeof firacReplaceSchema>;
type ArgumentsInput = z.infer<typeof argumentsReplaceSchema>;

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
        partes: input.partes ?? null,
        juiz: input.juiz ?? null,
        fase: input.fase ?? null,
        valorCausa: input.valorCausa ?? null,
        objetivo: input.objetivo ?? null,
        objetivoSecundario: input.objetivoSecundario ?? null,
        linhaVermelha: input.linhaVermelha ?? null,
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

export async function updateProcessLink(
  id: string,
  patch: PatchInput,
  actorId: string,
  opcoes?: { viaIa?: boolean },
) {
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
      viaIa: opcoes?.viaIa ?? false,
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

export async function replaceProcessLinkFirac(
  processLinkId: string,
  firac: FiracInput,
  actorId: string,
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await db.transaction(async (tx) => {
    const vinculo = await getProcessLinkOrThrow(tx, processLinkId);
    const antes = await tx.select().from(processLinkFirac).where(eq(processLinkFirac.processLinkId, processLinkId));

    await tx.delete(processLinkFirac).where(eq(processLinkFirac.processLinkId, processLinkId));

    const rows: { processLinkId: string; letra: "F" | "I" | "R" | "A" | "C"; paragrafo: string; ordem: number }[] = [];
    (["f", "i", "r", "a", "c"] as const).forEach((letra) => {
      firac[letra].forEach((paragrafo, i) =>
        rows.push({
          processLinkId,
          letra: letra.toUpperCase() as "F" | "I" | "R" | "A" | "C",
          paragrafo,
          ordem: i,
        }),
      );
    });
    if (rows.length > 0) await tx.insert(processLinkFirac).values(rows);

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_firac",
      entidadeId: processLinkId,
      acao: "substituir",
      antes,
      depois: firac,
      viaIa: opcoes?.viaIa ?? false,
    });
  });
}

export async function replaceProcessLinkArguments(
  processLinkId: string,
  args: ArgumentsInput,
  actorId: string,
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await db.transaction(async (tx) => {
    const vinculo = await getProcessLinkOrThrow(tx, processLinkId);
    const antes = await tx
      .select()
      .from(processLinkArguments)
      .where(eq(processLinkArguments.processLinkId, processLinkId));

    await tx.delete(processLinkArguments).where(eq(processLinkArguments.processLinkId, processLinkId));
    if (args.length > 0) {
      await tx.insert(processLinkArguments).values(
        args.map((a, i) => ({
          processLinkId,
          tag: `A${i + 1}`,
          titulo: a.titulo,
          fato: a.fato ?? null,
          previsaoLegal: a.previsaoLegal ?? null,
          jurisprudencia: a.jurisprudencia ?? null,
          doutrina: a.doutrina ?? null,
          ordem: i,
        })),
      );
    }

    await audit(tx, {
      userId: actorId,
      dossierId: vinculo.dossierId,
      entidade: "process_link_arguments",
      entidadeId: processLinkId,
      acao: "substituir",
      antes,
      depois: args,
      viaIa: opcoes?.viaIa ?? false,
    });
  });
}
