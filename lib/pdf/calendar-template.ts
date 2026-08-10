import "server-only";
import { DIAS } from "@/lib/calendar";
import { formatarDataBr } from "@/lib/dates";
import type { EventoAberto, EventoRealizado } from "@/lib/db/queries/calendar";
import type { MonthGrid, WeekRange } from "@/lib/calendar";
import { archivoFontFaceCss } from "@/lib/pdf/font";

const COR = {
  acento: "#C4443F",
  acentoEscuro: "#A6332F",
  neutro700: "#8C7F79",
  divisoria: "#EBE1DA",
  foraDoMes: "#F0E9E5",
  texto: "#3E332D",
};

function esc(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Membro = { id: string; nome: string; cor: string | null };

function legendaHtml(membros: Membro[]): string {
  return `
    <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:8px;">
      ${membros
        .map(
          (m) => `
        <span style="display:inline-flex; align-items:center; gap:6px; font-size:8.5pt; color:${COR.neutro700};">
          <span style="display:inline-block; width:10px; height:10px; background:${esc(m.cor) || "#B3A8A2"};"></span>
          ${esc(m.nome)}
        </span>`,
        )
        .join("")}
    </div>`;
}

function pageHead(titulo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  ${archivoFontFaceCss()}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Archivo', Arial, Helvetica, sans-serif; color: ${COR.texto}; }
  table { border-collapse: collapse; width: 100%; }
  .keep { break-inside: avoid; }
</style>
</head>
<body>
<h1 style="font-weight:300; font-size:20pt; letter-spacing:0.03em; margin:0 0 4px;">${esc(titulo)}</h1>`;
}

export function buildMonthCalendarPdfHtml(grid: MonthGrid, abertos: EventoAberto[], membros: Membro[]): string {
  const porDia = new Map<string, EventoAberto[]>();
  for (const ev of abertos) {
    const lista = porDia.get(ev.proximaData) ?? [];
    lista.push(ev);
    porDia.set(ev.proximaData, lista);
  }

  const linhasSemana = grid.weeks
    .map((semana) => {
      const celulas = semana
        .map((diaIso) => {
          const foraDoMes = diaIso < grid.monthStart || diaIso > grid.monthEnd;
          const numero = Number(diaIso.slice(8, 10));
          const eventos = porDia.get(diaIso) ?? [];
          const eventosHtml = eventos
            .map(
              (ev) => `
            <div style="border-left:2px solid ${esc(ev.responsavelCor) || "#B3A8A2"}; padding:2px 0 2px 4px; margin-top:3px;">
              <div style="font-size:7pt; font-weight:600; line-height:1.2;">${esc(ev.acao)}</div>
              <div style="font-size:6.5pt; color:${COR.neutro700}; line-height:1.2;">${esc(ev.caso)}</div>
            </div>`,
            )
            .join("");
          return `
          <td class="keep" style="vertical-align:top; border:1px solid ${COR.divisoria}; padding:4px; height:80px; width:14.28%; background:${foraDoMes ? COR.foraDoMes : "#fff"};">
            <div style="font-size:8pt; color:${foraDoMes ? "#B3A8A2" : COR.texto};">${numero}</div>
            ${eventosHtml}
          </td>`;
        })
        .join("");
      return `<tr>${celulas}</tr>`;
    })
    .join("");

  return `${pageHead(`Calendário — ${grid.label}`)}
${legendaHtml(membros)}
<table style="margin-top:16px; font-size:9pt;">
  <thead>
    <tr>
      ${DIAS.map((d) => `<th style="text-align:left; padding:4px; font-size:7.5pt; text-transform:uppercase; letter-spacing:0.08em; color:${COR.neutro700}; border-bottom:1px solid ${COR.acento};">${d}</th>`).join("")}
    </tr>
  </thead>
  <tbody>${linhasSemana}</tbody>
</table>
<p style="margin-top:12px; font-size:8pt; color:${COR.neutro700};">A grade traz só demandas em aberto.</p>
</body>
</html>`;
}

export function buildWeekCalendarPdfHtml(
  range: WeekRange,
  abertos: EventoAberto[],
  realizadas: EventoRealizado[],
  membros: Membro[],
): string {
  const abertosHtml = abertos
    .map(
      (ev) => `
    <tr class="keep">
      <td style="padding:6px 12px 6px 0; border-bottom:1px solid ${COR.divisoria}; border-left:3px solid ${esc(ev.responsavelCor) || "#B3A8A2"}; padding-left:8px; font-weight:600;">${esc(formatarDataBr(ev.proximaData))}</td>
      <td style="padding:6px 0; border-bottom:1px solid ${COR.divisoria};">${esc(ev.acao)} — ${esc(ev.caso)} · ${esc(ev.responsavelNome) || "—"}</td>
    </tr>`,
    )
    .join("");

  const realizadasHtml = realizadas
    .map(
      (ev) => `
    <tr class="keep">
      <td style="padding:6px 12px 6px 0; border-bottom:1px solid ${COR.divisoria}; border-left:3px solid ${esc(ev.responsavelCor) || "#B3A8A2"}; padding-left:8px; font-weight:600;">${esc(formatarDataBr(ev.data))}</td>
      <td style="padding:6px 0; border-bottom:1px solid ${COR.divisoria};">${esc(ev.acao)} — ${esc(ev.caso)} · ${esc(ev.resultado)}</td>
    </tr>`,
    )
    .join("");

  return `${pageHead(`Calendário — ${range.label}`)}
${legendaHtml(membros)}
<div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:16px;">
  <div>
    <h3 style="font-weight:400; font-size:11pt; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px;">Em aberto</h3>
    <table style="font-size:9.5pt;"><tbody>${abertosHtml || `<tr><td style="padding:8px 0; color:${COR.neutro700};">Nenhuma demanda em aberto.</td></tr>`}</tbody></table>
  </div>
  <div>
    <h3 style="font-weight:400; font-size:11pt; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px;">Realizadas</h3>
    <table style="font-size:9.5pt;"><tbody>${realizadasHtml || `<tr><td style="padding:8px 0; color:${COR.neutro700};">Nenhuma tentativa registrada.</td></tr>`}</tbody></table>
  </div>
</div>
</body>
</html>`;
}
