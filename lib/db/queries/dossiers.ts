import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  dossiers,
  dossierFields,
  timelineEntries,
  firacBlocks,
  argumentsTable,
  dossierVersions,
} from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { computeDossierName } from "@/lib/db/dossier-name";
import { camposIniciaisPorMateria } from "@/lib/db/materia-fields";
import { etapaLabel, type EtapaIndex } from "@/lib/dossier-constants";
import { NotFoundError } from "@/lib/errors";
import type { DossierFull } from "@/lib/types/dossier";
import type {
  createDossierSchema,
  patchDossierSchema,
  timelineReplaceSchema,
  firacReplaceSchema,
  argumentsReplaceSchema,
} from "@/lib/validation/dossier";
import type { z } from "zod";

type CreateInput = z.infer<typeof createDossierSchema>;
type PatchInput = z.infer<typeof patchDossierSchema>;
type TimelineInput = z.infer<typeof timelineReplaceSchema>;
type FiracInput = z.infer<typeof firacReplaceSchema>;
type ArgumentsInput = z.infer<typeof argumentsReplaceSchema>;

function brDateToIso(texto: string): string | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

export async function createDossier(input: CreateInput, actorId: string): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const nome = computeDossierName(input);
    const [dossier] = await tx
      .insert(dossiers)
      .values({
        cliente: input.cliente,
        caso: input.caso,
        numeroProcesso: input.numeroProcesso,
        nome,
        materia: input.materia,
        responsavelId: input.responsavelId ?? null,
        revisorId: actorId,
        marco: "Abertura do dossiê",
        versao: "v1",
      })
      .returning({ id: dossiers.id });

    const campos = camposIniciaisPorMateria(input.materia);
    if (campos.length > 0) {
      await tx.insert(dossierFields).values(campos.map((c) => ({ dossierId: dossier.id, ...c })));
    }

    await tx.insert(dossierVersions).values({
      dossierId: dossier.id,
      versao: "v1",
      data: new Date().toISOString().slice(0, 10),
      marco: "Abertura do dossiê",
      revisorId: actorId,
      etapa: null,
    });

    await audit(tx, {
      userId: actorId,
      dossierId: dossier.id,
      entidade: "dossiers",
      entidadeId: dossier.id,
      acao: "criar",
      depois: { cliente: input.cliente, caso: input.caso, numeroProcesso: input.numeroProcesso, materia: input.materia },
    });

    return { id: dossier.id };
  });
}

export async function getDossierFull(id: string): Promise<DossierFull | undefined> {
  const row = await db.query.dossiers.findFirst({
    where: eq(dossiers.id, id),
    with: {
      responsavel: true,
      revisor: true,
      camposEspecificos: { orderBy: (t, { asc }) => [asc(t.ordem)] },
      timeline: { orderBy: (t, { asc }) => [asc(t.ordem)] },
      firac: { orderBy: (t, { asc }) => [asc(t.ordem)] },
      passos: {
        orderBy: (t, { asc }) => [asc(t.ordem)],
        with: {
          responsavel: true,
          tentativas: { orderBy: (t, { asc }) => [asc(t.data)] },
        },
      },
      prazos: { orderBy: (t, { asc }) => [asc(t.ordem)] },
      argumentos: { orderBy: (t, { asc }) => [asc(t.ordem)] },
      versoes: { orderBy: (t, { desc }) => [desc(t.data)], with: { revisor: true } },
    },
  });
  // Ver o comentário em lib/types/dossier.ts sobre o cast: bug de inferência
  // do Drizzle nas relações para `users`, não reflete o shape em runtime.
  return row as unknown as DossierFull | undefined;
}

async function getDossierOrThrow(id: string) {
  const [row] = await db.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
  if (!row) throw new NotFoundError("Dossiê não encontrado.");
  return row;
}

export async function updateDossierGeneral(id: string, patch: PatchInput, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [antes] = await tx.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
    if (!antes) throw new NotFoundError("Dossiê não encontrado.");

    const { camposEspecificos, ...gerais } = patch;

    const nomeInput = {
      cliente: gerais.cliente ?? antes.cliente,
      caso: gerais.caso ?? antes.caso,
      numeroProcesso: gerais.numeroProcesso ?? antes.numeroProcesso,
    };

    await tx
      .update(dossiers)
      .set({ ...gerais, nome: computeDossierName(nomeInput) })
      .where(eq(dossiers.id, id));

    // Trocar a matéria muda o conjunto de campos específicos (labels não
    // fazem mais sentido na matéria nova) — regenera o template, preservando
    // só "Provisão / risco estimado", que existe em todas as matérias.
    const materiaMudou = patch.materia !== undefined && patch.materia !== antes.materia;
    if (materiaMudou) {
      const [provisaoAtual] = await tx
        .select()
        .from(dossierFields)
        .where(and(eq(dossierFields.dossierId, id), eq(dossierFields.label, "Provisão / risco estimado")));

      await tx.delete(dossierFields).where(eq(dossierFields.dossierId, id));

      const novoTemplate = camposIniciaisPorMateria(patch.materia!);
      await tx.insert(dossierFields).values(
        novoTemplate.map((c) => ({
          dossierId: id,
          ...c,
          valor: c.label === "Provisão / risco estimado" ? provisaoAtual?.valor ?? "" : c.valor,
        })),
      );
    }

    if (camposEspecificos) {
      for (const campo of camposEspecificos) {
        await tx
          .update(dossierFields)
          .set({ valor: campo.valor })
          .where(and(eq(dossierFields.dossierId, id), eq(dossierFields.label, campo.label)));
      }
    }

    const [depois] = await tx.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);

    await audit(tx, {
      userId: actorId,
      dossierId: id,
      entidade: "dossiers",
      entidadeId: id,
      acao: "atualizar-gerais",
      antes,
      depois,
    });
  });
}

export async function replaceTimeline(id: string, entries: TimelineInput, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await getDossierOrThrow(id);
    const antes = await tx.select().from(timelineEntries).where(eq(timelineEntries.dossierId, id));

    await tx.delete(timelineEntries).where(eq(timelineEntries.dossierId, id));
    if (entries.length > 0) {
      await tx.insert(timelineEntries).values(
        entries.map((e, i) => ({
          dossierId: id,
          dataTexto: e.dataTexto,
          data: brDateToIso(e.dataTexto),
          ato: e.ato,
          ordem: i,
        })),
      );
    }

    await audit(tx, {
      userId: actorId,
      dossierId: id,
      entidade: "timeline_entries",
      entidadeId: id,
      acao: "substituir",
      antes,
      depois: entries,
    });
  });
}

export async function replaceFirac(id: string, firac: FiracInput, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await getDossierOrThrow(id);
    const antes = await tx.select().from(firacBlocks).where(eq(firacBlocks.dossierId, id));

    await tx.delete(firacBlocks).where(eq(firacBlocks.dossierId, id));

    const rows: { dossierId: string; letra: "F" | "I" | "R" | "A" | "C"; paragrafo: string; ordem: number }[] = [];
    (["f", "i", "r", "a", "c"] as const).forEach((letra) => {
      firac[letra].forEach((paragrafo, i) =>
        rows.push({ dossierId: id, letra: letra.toUpperCase() as "F" | "I" | "R" | "A" | "C", paragrafo, ordem: i }),
      );
    });
    if (rows.length > 0) await tx.insert(firacBlocks).values(rows);

    await audit(tx, {
      userId: actorId,
      dossierId: id,
      entidade: "firac_blocks",
      entidadeId: id,
      acao: "substituir",
      antes,
      depois: firac,
    });
  });
}

export async function replaceArguments(id: string, args: ArgumentsInput, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await getDossierOrThrow(id);
    const antes = await tx.select().from(argumentsTable).where(eq(argumentsTable.dossierId, id));

    await tx.delete(argumentsTable).where(eq(argumentsTable.dossierId, id));
    if (args.length > 0) {
      await tx.insert(argumentsTable).values(
        args.map((a, i) => ({
          dossierId: id,
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
      dossierId: id,
      entidade: "arguments",
      entidadeId: id,
      acao: "substituir",
      antes,
      depois: args,
    });
  });
}

export async function concludeEdit(id: string, etapa: EtapaIndex, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [antes] = await tx.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
    if (!antes) throw new NotFoundError("Dossiê não encontrado.");

    const proximaVersao = "v" + ((parseInt(antes.versao.replace(/\D/g, ""), 10) || 0) + 1);
    const marco = `Revisão de ${etapaLabel(etapa)}`;
    const hoje = new Date().toISOString().slice(0, 10);

    await tx
      .update(dossiers)
      .set({ versao: proximaVersao, marco, revisorId: actorId, atualizadoEm: new Date().toISOString() })
      .where(eq(dossiers.id, id));

    await tx.insert(dossierVersions).values({
      dossierId: id,
      versao: proximaVersao,
      data: hoje,
      marco,
      revisorId: actorId,
      etapa: etapaLabel(etapa),
    });

    await audit(tx, {
      userId: actorId,
      dossierId: id,
      entidade: "dossiers",
      entidadeId: id,
      acao: "concluir-edicao",
      antes: { versao: antes.versao },
      depois: { versao: proximaVersao, etapa: etapaLabel(etapa) },
    });
  });
}

export async function archiveDossier(id: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [antes] = await tx.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
    if (!antes) throw new NotFoundError("Dossiê não encontrado.");

    await tx.update(dossiers).set({ arquivado: true }).where(eq(dossiers.id, id));

    await audit(tx, {
      userId: actorId,
      dossierId: id,
      entidade: "dossiers",
      entidadeId: id,
      acao: "arquivar",
      antes: { arquivado: antes.arquivado },
      depois: { arquivado: true },
    });
  });
}
