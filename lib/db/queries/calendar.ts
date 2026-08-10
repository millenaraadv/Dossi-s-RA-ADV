import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type EventoAberto = {
  id: string;
  acao: string;
  proximaData: string;
  dossierId: string;
  cliente: string;
  caso: string;
  numeroProcesso: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  responsavelCor: string | null;
};

export type EventoRealizado = {
  id: string;
  data: string;
  resultado: string;
  acao: string;
  dossierId: string;
  cliente: string;
  caso: string;
  numeroProcesso: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  responsavelCor: string | null;
  registradoPorNome: string | null;
};

/**
 * Projeção pura de `steps` (abertos) e `step_attempts` (realizadas) — sem
 * tabela própria. Editar um passo no dossiê muda isto na hora.
 */
export async function getCalendarProjection(params: {
  start: string;
  end: string;
  responsavelId?: string;
}): Promise<{ abertos: EventoAberto[]; realizadas: EventoRealizado[] }> {
  const responsavelId = params.responsavelId || null;

  const abertos = await db.execute<EventoAberto>(sql`
    SELECT
      s.id,
      s.acao,
      s.proxima_data::text AS "proximaData",
      d.id AS "dossierId",
      d.cliente,
      d.caso,
      d.numero_processo AS "numeroProcesso",
      s.responsavel_id AS "responsavelId",
      u.nome AS "responsavelNome",
      u.cor AS "responsavelCor"
    FROM steps s
    JOIN dossiers d ON d.id = s.dossier_id
    LEFT JOIN users u ON u.id = s.responsavel_id
    WHERE s.concluido = false
      AND s.proxima_data BETWEEN ${params.start}::date AND ${params.end}::date
      AND d.arquivado = false
      AND (${responsavelId}::uuid IS NULL OR s.responsavel_id = ${responsavelId}::uuid)
    ORDER BY s.proxima_data ASC
  `);

  const realizadas = await db.execute<EventoRealizado>(sql`
    SELECT
      sa.id,
      sa.data::text AS "data",
      sa.resultado,
      s.acao,
      d.id AS "dossierId",
      d.cliente,
      d.caso,
      d.numero_processo AS "numeroProcesso",
      s.responsavel_id AS "responsavelId",
      u.nome AS "responsavelNome",
      u.cor AS "responsavelCor",
      ru.nome AS "registradoPorNome"
    FROM step_attempts sa
    JOIN steps s ON s.id = sa.step_id
    JOIN dossiers d ON d.id = s.dossier_id
    LEFT JOIN users u ON u.id = s.responsavel_id
    LEFT JOIN users ru ON ru.id = sa.registrado_por_id
    WHERE sa.data BETWEEN ${params.start}::date AND ${params.end}::date
      AND d.arquivado = false
      AND (${responsavelId}::uuid IS NULL OR s.responsavel_id = ${responsavelId}::uuid)
    ORDER BY sa.data DESC
  `);

  return { abertos: [...abertos], realizadas: [...realizadas] };
}
