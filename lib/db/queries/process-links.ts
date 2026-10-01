import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { processLinks, processLinkFirac, processLinkArguments, dossiers } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { brDataParaIso } from "@/lib/dates";
import { deleteAuto } from "@/lib/supabase/storage";
import { NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { createProcessLinkSchema, patchProcessLinkSchema } from "@/lib/validation/process-link";
import type { firacReplaceSchema, argumentsReplaceSchema } from "@/lib/validation/dossier";

type CreateInput = z.infer<typeof createProcessLinkSchema>;
type PatchInput = z.infer<typeof patchProcessLinkSchema>;
type FiracInput = z.infer<typeof firacReplaceSchema>;
type ArgumentsInput = z.infer<typeof argumentsReplaceSchema>;

/**
 * Pra montar o contexto das sugestões de IA dentro de um vínculo (ver
 * lib/ai/prompts/contexto-vinculo.ts) — traz o FIRAC do próprio vínculo e o
 * nome do cliente do dossiê pai (o vínculo não tem campo de cliente próprio).
 */
export async function getProcessLinkWithContext(id: string) {
  const vinculo = await db.query.processLinks.findFirst({
    where: eq(processLinks.id, id),
    with: {
      firac: { orderBy: (t, { asc }) => [asc(t.ordem)] },
      dossier: { columns: { cliente: true } },
    },
  });
  if (!vinculo) throw new NotFoundError("Vínculo processual não encontrado.");
  return vinculo;
}

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

/**
 * Chamado só pela rota de import (nunca pelo PATCH público — por isso fica
 * fora de patchProcessLinkSchema) logo após o upload dar certo. Se já havia
 * um anexo anterior (outro PDF enviado antes), apaga o arquivo velho do
 * storage — sem isso, cada reenvio deixaria um arquivo órfão pra trás.
 */
export async function setProcessLinkAttachment(
  id: string,
  attachment: { arquivoNome: string; arquivoStorageKey: string },
): Promise<void> {
  const atual = await getProcessLinkOrThrow(db, id);
  if (atual.arquivoAnexoStorageKey && atual.arquivoAnexoStorageKey !== attachment.arquivoStorageKey) {
    await deleteAuto(atual.arquivoAnexoStorageKey).catch(() => {});
  }

  await db
    .update(processLinks)
    .set({
      arquivoAnexoNome: attachment.arquivoNome,
      arquivoAnexoStorageKey: attachment.arquivoStorageKey,
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(processLinks.id, id));
}

/**
 * "Desanexar o PDF" (README: usuário anexou o arquivo errado) — remove só o
 * arquivo e a referência a ele. Não mexe nos campos que já foram extraídos
 * (partes/FIRAC/argumentos etc.): esses continuam editáveis à mão, ou o
 * usuário anexa o PDF certo em seguida, que os sobrescreve numa nova
 * extração.
 */
export async function removeProcessLinkAttachment(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const antes = await getProcessLinkOrThrow(tx, id);
    if (!antes.arquivoAnexoStorageKey) throw new NotFoundError("Este vínculo não tem PDF anexado.");

    await deleteAuto(antes.arquivoAnexoStorageKey);

    await tx
      .update(processLinks)
      .set({ arquivoAnexoNome: null, arquivoAnexoStorageKey: null, atualizadoEm: new Date().toISOString() })
      .where(eq(processLinks.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: antes.dossierId,
      entidade: "process_links",
      entidadeId: id,
      acao: "remover-anexo",
      antes: { arquivoAnexoNome: antes.arquivoAnexoNome },
      depois: { arquivoAnexoNome: null },
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
