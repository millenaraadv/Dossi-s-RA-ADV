import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type OrdemLista = "alfabetica" | "recente";

export type DossierListItem = {
  id: string;
  nome: string;
  materia: string;
  fase: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  responsavelCor: string | null;
  proximaAcao: string | null;
  proximaData: string | null;
};

/**
 * Busca por ILIKE + unaccent() em tempo de consulta (não em coluna gerada —
 * unaccent() é STABLE, não IMMUTABLE). "Próxima demanda" e a ordenação
 * "recente" vêm de LATERAL join sobre `steps`: o calendário e a lista são
 * sempre projeção dessa tabela, nunca uma cópia.
 *
 * "recente" ordena pela mesma data mostrada no card (a próxima demanda em
 * aberto), da mais urgente para a mais distante — não pela última tentativa
 * registrada, que é uma data passada sem relação com o que aparece na tela.
 */
export async function listDossiers(params: {
  q?: string;
  responsavelId?: string;
  ordem: OrdemLista;
}): Promise<DossierListItem[]> {
  const q = params.q?.trim() || null;
  const responsavelId = params.responsavelId || null;

  const orderBy =
    params.ordem === "recente"
      ? sql`prox.proxima_data ASC NULLS LAST, d.nome COLLATE "pt-BR-x-icu" ASC`
      : sql`d.nome COLLATE "pt-BR-x-icu" ASC`;

  const result = await db.execute<DossierListItem>(sql`
    SELECT
      d.id,
      d.nome,
      d.materia,
      d.fase,
      d.responsavel_id AS "responsavelId",
      u.nome AS "responsavelNome",
      u.cor AS "responsavelCor",
      prox.acao AS "proximaAcao",
      prox.proxima_data::text AS "proximaData"
    FROM dossiers d
    LEFT JOIN users u ON u.id = d.responsavel_id
    LEFT JOIN LATERAL (
      SELECT s.acao, s.proxima_data
      FROM steps s
      WHERE s.dossier_id = d.id AND s.concluido = false AND s.proxima_data IS NOT NULL
      ORDER BY s.proxima_data ASC
      LIMIT 1
    ) prox ON true
    WHERE d.arquivado = false
      AND (
        ${q}::text IS NULL
        OR extensions.unaccent(d.cliente) ILIKE extensions.unaccent('%' || ${q} || '%')
        OR extensions.unaccent(d.caso) ILIKE extensions.unaccent('%' || ${q} || '%')
        OR d.numero_processo ILIKE '%' || ${q} || '%'
        OR extensions.unaccent(d.materia::text) ILIKE extensions.unaccent('%' || ${q} || '%')
        OR extensions.unaccent(coalesce(d.fase, '')) ILIKE extensions.unaccent('%' || ${q} || '%')
        OR extensions.unaccent(coalesce(u.nome, '')) ILIKE extensions.unaccent('%' || ${q} || '%')
      )
      AND (${responsavelId}::uuid IS NULL OR d.responsavel_id = ${responsavelId}::uuid)
    ORDER BY ${orderBy}
  `);

  return [...result];
}

export async function countDossiersAtivos(): Promise<number> {
  const [row] = await db.execute<{ total: number }>(
    sql`SELECT count(*)::int AS total FROM dossiers WHERE arquivado = false`,
  );
  return row?.total ?? 0;
}
