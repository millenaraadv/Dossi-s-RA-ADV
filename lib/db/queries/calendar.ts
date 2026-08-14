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
 * Projeção pura de `steps`/`step_attempts` (passos) e `deadlines` (prazos) —
 * sem tabela própria. Editar um passo ou prazo no dossiê muda isto na hora.
 * Um prazo entra como "aberto" na data do texto do prazo (`data_texto`,
 * normalizado para dd/mm/aaaa na digitação — ver lib/dates.ts) enquanto o
 * protocolo não foi marcado, e como "realizado" na data do protocolo depois
 * de marcado. O rótulo ganha o prefixo "Prazo:" para diferenciar de passos.
 */
export async function getCalendarProjection(params: {
  start: string;
  end: string;
  responsavelId?: string;
}): Promise<{ abertos: EventoAberto[]; realizadas: EventoRealizado[] }> {
  const responsavelId = params.responsavelId || null;

  const abertos = await db.execute<EventoAberto>(sql`
    (
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
    )
    UNION ALL
    (
      SELECT
        p.id,
        ('Prazo: ' || p.ato) AS "acao",
        to_date(p.data_texto, 'DD/MM/YYYY')::text AS "proximaData",
        d.id AS "dossierId",
        d.cliente,
        d.caso,
        d.numero_processo AS "numeroProcesso",
        d.responsavel_id AS "responsavelId",
        u.nome AS "responsavelNome",
        u.cor AS "responsavelCor"
      FROM deadlines p
      JOIN dossiers d ON d.id = p.dossier_id
      LEFT JOIN users u ON u.id = d.responsavel_id
      WHERE p.protocolo_ok = false
        AND p.data_texto ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        AND to_date(p.data_texto, 'DD/MM/YYYY') BETWEEN ${params.start}::date AND ${params.end}::date
        AND d.arquivado = false
        AND (${responsavelId}::uuid IS NULL OR d.responsavel_id = ${responsavelId}::uuid)
    )
    ORDER BY "proximaData" ASC
  `);

  const realizadas = await db.execute<EventoRealizado>(sql`
    (
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
    )
    UNION ALL
    (
      SELECT
        p.id,
        p.protocolo_data::text AS "data",
        'Protocolado' AS "resultado",
        ('Prazo: ' || p.ato) AS "acao",
        d.id AS "dossierId",
        d.cliente,
        d.caso,
        d.numero_processo AS "numeroProcesso",
        d.responsavel_id AS "responsavelId",
        u.nome AS "responsavelNome",
        u.cor AS "responsavelCor",
        pu.nome AS "registradoPorNome"
      FROM deadlines p
      JOIN dossiers d ON d.id = p.dossier_id
      LEFT JOIN users u ON u.id = d.responsavel_id
      LEFT JOIN users pu ON pu.id = p.protocolo_por_id
      WHERE p.protocolo_ok = true
        AND p.protocolo_data BETWEEN ${params.start}::date AND ${params.end}::date
        AND d.arquivado = false
        AND (${responsavelId}::uuid IS NULL OR d.responsavel_id = ${responsavelId}::uuid)
    )
    ORDER BY "data" DESC
  `);

  return { abertos: [...abertos], realizadas: [...realizadas] };
}
