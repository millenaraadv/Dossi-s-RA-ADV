import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DossierFull } from "@/lib/types/dossier";
import { formatarDataBr, formatarDataLonga } from "@/lib/dates";
import { FIRAC_LETRAS } from "@/lib/dossier-constants";
import { archivoFontFaceCss } from "@/lib/pdf/font";

const COR = {
  acento: "#C4443F",
  acentoEscuro: "#A6332F",
  acentoProfundo: "#8F3226",
  divisoria: "#EBE1DA",
  neutro700: "#8C7F79",
  neutro800: "#5C514C",
  texto: "#3E332D",
};

const FIRAC_TITULO_PDF: Record<string, string> = {
  F: "Fatos",
  I: "Questão",
  R: "Regra",
  A: "Aplicação / análise",
  C: "Conclusão",
};

function esc(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoBase64(): string {
  const p = path.join(process.cwd(), "public/assets/marca-rabelo-aguiar.png");
  return fs.readFileSync(p).toString("base64");
}

function linhaInfo(label: string, valor: string): string {
  return `
    <tr class="keep">
      <th style="width:26%; text-align:left; vertical-align:top; padding:6px 16px 6px 0; border-bottom:1px solid ${COR.divisoria}; font-size:8.5pt; text-transform:uppercase; letter-spacing:0.08em; font-weight:600; color:${COR.neutro700};">${esc(label)}</th>
      <td style="padding:6px 0; border-bottom:1px solid ${COR.divisoria};">${esc(valor) || "—"}</td>
    </tr>`;
}

function proximaRevisao(d: DossierFull): string {
  const abertos = d.passos.filter((p) => !p.concluido && p.proximaData).map((p) => p.proximaData as string);
  if (abertos.length === 0) return "—";
  return formatarDataBr(abertos.sort()[0]);
}

export function buildHeaderTemplate(d: DossierFull): string {
  return `
    <div style="width:100%; font-size:8pt; padding:0 0.7in; display:flex; justify-content:space-between; align-items:center; font-family:Arial,Helvetica,sans-serif;">
      <span>
        <span style="text-transform:uppercase; letter-spacing:0.12em; color:#8C7F79;">Dossiê processual</span>
        &nbsp;&nbsp;<span style="color:${COR.acento};">${esc(d.numeroProcesso)}</span>
      </span>
      <img src="data:image/png;base64,${logoBase64()}" style="height:26pt; width:auto; display:block;" />
    </div>`;
}

export function buildFooterTemplate(d: DossierFull): string {
  return `
    <div style="width:100%; font-size:7pt; padding:0 0.7in; font-family:Arial,Helvetica,sans-serif; color:${COR.neutro700};">
      <div style="display:flex; justify-content:space-between;">
        <span>Atualizado em ${esc(formatarDataLonga(d.atualizadoEm.slice(0, 10)))} · v${esc(d.versao)} — ${esc(d.marco)} · Revisão: ${esc(d.revisor?.nome ?? "—")} · Próxima revisão: ${esc(proximaRevisao(d))}</span>
        <span class="pageNumber"></span>
      </div>
    </div>`;
}

export function buildDossierPdfHtml(d: DossierFull): string {
  const camposEspecificosRows = d.camposEspecificos.map((c) => linhaInfo(c.label, c.valor)).join("");
  const objetoPrincipal = d.camposEspecificos[0]?.valor ?? "";

  const timelineHtml = d.timeline
    .map(
      (t) => `
    <div class="keep" style="display:grid; grid-template-columns:80px 1fr; gap:12px; padding:8px 0; border-bottom:1px solid ${COR.divisoria};">
      <div style="font-size:9.5pt; font-weight:600; color:${COR.neutro700};">${esc(t.dataTexto)}</div>
      <div style="font-size:10pt; line-height:1.4;">${esc(t.ato)}</div>
    </div>`,
    )
    .join("");

  const firacHtml = FIRAC_LETRAS.map((letra) => {
    const paragrafos = d.firac.filter((b) => b.letra === letra).map((b) => b.paragrafo);
    if (paragrafos.length === 0) return "";
    return `
    <div class="keep" style="display:flex; gap:16px; margin-top:16px; padding-bottom:16px; border-bottom:1px solid ${COR.divisoria};">
      <div style="flex:0 0 34px; height:34px; background:${COR.acento}; color:#fff; font-weight:400; font-size:16pt; line-height:34px; text-align:center;">${letra}</div>
      <div>
        <h3 style="font-weight:400; font-size:12pt; margin:0 0 8px; text-transform:uppercase; letter-spacing:0.02em;">${FIRAC_TITULO_PDF[letra]}</h3>
        ${paragrafos.map((p) => `<p style="margin:0 0 8px; font-size:10.5pt; line-height:1.5; max-width:66ch;">${esc(p)}</p>`).join("")}
      </div>
    </div>`;
  }).join("");

  const passosHtml = d.passos
    .map((p, i) => {
      const tentativas =
        p.tentativas.length === 0
          ? `<span style="color:#9C8F89;">Nenhuma ainda</span>`
          : p.tentativas.map((t) => `<strong>${esc(formatarDataBr(t.data))}</strong> — ${esc(t.resultado)}`).join("<br/>");
      return `
    <tr class="keep">
      <td style="padding:6px 12px 6px 0; border-bottom:1px solid ${COR.divisoria}; font-weight:600; color:${COR.acentoEscuro};">${String(i + 1).padStart(2, "0")}</td>
      <td style="padding:6px 12px; border-bottom:1px solid ${COR.divisoria};">${esc(p.acao)}${p.concluido ? " (concluído)" : ""}</td>
      <td style="padding:6px 12px; border-bottom:1px solid ${COR.divisoria};">${tentativas}</td>
      <td style="padding:6px 12px; border-bottom:1px solid ${COR.divisoria};">${esc(p.responsavel?.nome) || "—"}</td>
      <td style="padding:6px 0 6px 12px; border-bottom:1px solid ${COR.divisoria}; font-weight:600;">${esc(formatarDataBr(p.proximaData))}</td>
    </tr>`;
    })
    .join("");

  const prazosHtml = d.prazos
    .map(
      (p) => `
    <tr class="keep">
      <td style="padding:6px 12px 6px 0; border-bottom:1px solid ${COR.divisoria};">${esc(p.ato)}</td>
      <td style="padding:6px 12px; border-bottom:1px solid ${COR.divisoria};">${esc(p.contagem)}</td>
      <td style="padding:6px 0 6px 12px; border-bottom:1px solid ${COR.divisoria}; font-weight:600;">${esc(p.dataTexto)}</td>
    </tr>`,
    )
    .join("");

  const argumentosHtml = d.argumentos
    .map(
      (a) => `
    <div class="keep" style="margin-top:24px; border-top:1px solid ${COR.acento}; padding-top:12px;">
      <div style="display:flex; gap:12px; align-items:baseline; margin-bottom:8px;">
        <span style="font-weight:400; font-size:11pt; color:${COR.acento};">${esc(a.tag)}</span>
        <h3 style="font-weight:400; font-size:12.5pt; margin:0; line-height:1.25;">${esc(a.titulo)}</h3>
      </div>
      ${a.fato ? `<p style="margin:0 0 12px; font-size:10.5pt; line-height:1.5; max-width:66ch;">${esc(a.fato)}</p>` : ""}
      <div style="border-top:1px solid ${COR.divisoria};">
        <div style="display:grid; grid-template-columns:22% 1fr; gap:16px; padding:8px 0; border-bottom:1px solid ${COR.divisoria};">
          <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700};">Previsão legal</div>
          <div style="font-size:10pt; line-height:1.45;">${esc(a.previsaoLegal) || "—"}</div>
        </div>
        <div style="display:grid; grid-template-columns:22% 1fr; gap:16px; padding:8px 0; border-bottom:1px solid ${COR.divisoria};">
          <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700};">Jurisprudência</div>
          <div style="font-size:10pt; line-height:1.45;">${esc(a.jurisprudencia) || "—"}</div>
        </div>
        <div style="display:grid; grid-template-columns:22% 1fr; gap:16px; padding:8px 0;">
          <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700};">Doutrina</div>
          <div style="font-size:10pt; line-height:1.45;">${esc(a.doutrina) || "—"}</div>
        </div>
      </div>
    </div>`,
    )
    .join("");

  const historicoHtml = d.versoes
    .map(
      (v) => `
    <tr class="keep">
      <td style="padding:6px 12px 6px 0; border-bottom:1px solid ${COR.divisoria}; font-weight:600;">${esc(v.versao)}</td>
      <td style="padding:6px 12px; border-bottom:1px solid ${COR.divisoria};">${esc(formatarDataBr(v.data))}</td>
      <td style="padding:6px 12px; border-bottom:1px solid ${COR.divisoria};">${esc(v.marco) || "—"}${v.etapa ? ` (${esc(v.etapa)})` : ""}</td>
      <td style="padding:6px 0 6px 12px; border-bottom:1px solid ${COR.divisoria};">${esc(v.revisor?.nome) || "—"}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  ${archivoFontFaceCss()}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Archivo', Arial, Helvetica, sans-serif; color: ${COR.texto}; }
  h1, h2, h3 { font-family: 'Archivo', Arial, Helvetica, sans-serif; }
  .keep { break-inside: avoid; }
  table { border-collapse: collapse; }
</style>
</head>
<body>

<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:12px;">
  <div style="font-size:9pt; text-transform:uppercase; letter-spacing:0.14em; font-weight:600; color:${COR.acentoEscuro};">Dossiê de processo judicial</div>
  <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.14em; font-weight:400; color:#fff; background:${COR.acento}; padding:4px 12px;">Confidencial — uso interno</div>
</div>

<h1 style="font-weight:300; font-size:27pt; line-height:1.15; letter-spacing:0.03em; margin:0 0 16px; width:70%;">${esc(d.cliente)} - ${esc(d.caso)}</h1>

<div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento};">
  <div style="padding:12px 16px 12px 0;">
    <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700}; margin-bottom:4px;">Objeto</div>
    <div style="font-size:10.5pt; font-weight:600; line-height:1.3;">${esc(objetoPrincipal) || "—"}</div>
  </div>
  <div style="padding:12px 0 12px 16px; border-left:1px solid ${COR.divisoria};">
    <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700}; margin-bottom:4px;">Risco / prognóstico</div>
    <div style="font-size:10.5pt; font-weight:600; line-height:1.3; color:${COR.acentoEscuro};">${esc(d.risco)}</div>
  </div>
</div>

<div class="keep" style="margin-top:24px; border-bottom:1px solid ${COR.divisoria}; padding-bottom:16px;">
  <div style="font-size:8.5pt; text-transform:uppercase; letter-spacing:0.12em; font-weight:600; color:${COR.acentoEscuro}; margin-bottom:8px;">Resumo executivo</div>
  <p style="margin:0; font-size:11pt; line-height:1.5; max-width:74ch;">${esc(d.resumo) || "—"}</p>
</div>

<div style="display:flex; align-items:baseline; gap:16px; border-top:1px solid ${COR.acento}; margin-top:32px; padding-top:12px;">
  <div style="font-weight:300; font-size:22pt; line-height:1; color:${COR.acento};">01</div>
  <h2 style="font-weight:400; font-size:15pt; letter-spacing:0.05em; margin:0; text-transform:uppercase;">Informações gerais</h2>
</div>

<table style="width:100%; margin-top:16px; font-size:10pt;">
  <tbody>
    ${linhaInfo("Número do processo", d.numeroProcesso)}
    ${linhaInfo("Partes", d.partes ?? "")}
    ${linhaInfo("Advogado da parte contrária", d.advogadoContrario ?? "")}
    ${linhaInfo("Profissional responsável", d.responsavel?.nome ?? "")}
    ${linhaInfo("Órgão / juízo", d.orgao ?? "")}
    ${linhaInfo("Magistrado", d.juiz ?? "")}
    ${linhaInfo("Fase e rito", d.fase ?? "")}
    ${linhaInfo("Valor da causa", d.valorCausa ?? "")}
    ${linhaInfo("Matéria", d.materia)}
    ${camposEspecificosRows}
  </tbody>
</table>

<h3 style="font-weight:400; font-size:11pt; text-transform:uppercase; letter-spacing:0.06em; margin:32px 0 12px;">Linha do tempo</h3>
<div style="border-left:1px solid ${COR.acento}; padding-left:16px;">
  ${timelineHtml || `<p style="font-size:10pt; color:${COR.neutro700};">Nenhuma movimentação registrada.</p>`}
</div>

<div style="border-top:1px solid ${COR.acento}; margin-top:32px; padding-top:12px;">
  <div style="font-size:9pt; text-transform:uppercase; letter-spacing:0.12em; font-weight:600; color:${COR.acentoEscuro};">Relatório FIRAC</div>
</div>
${firacHtml}

<div style="display:flex; align-items:baseline; gap:16px; border-top:1px solid ${COR.acento}; margin-top:32px; padding-top:12px;">
  <div style="font-weight:300; font-size:22pt; line-height:1; color:${COR.acento};">02</div>
  <h2 style="font-weight:400; font-size:15pt; letter-spacing:0.05em; margin:0; text-transform:uppercase;">Estratégia</h2>
</div>

<div class="keep" style="margin-top:16px; padding:16px; background:${COR.acento}; color:#fff;">
  <div style="font-size:8.5pt; text-transform:uppercase; letter-spacing:0.12em; font-weight:600; margin-bottom:8px;">Objetivo</div>
  <p style="margin:0; font-weight:600; font-size:14pt; line-height:1.28; max-width:48ch;">${esc(d.objetivo) || "—"}</p>
</div>

<div class="keep" style="margin-top:16px; display:grid; grid-template-columns:1fr 1fr; border-top:1px solid ${COR.divisoria}; border-bottom:1px solid ${COR.divisoria};">
  <div style="padding:12px 16px 12px 0;">
    <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700}; margin-bottom:4px;">Objetivo secundário</div>
    <div style="font-size:10pt; line-height:1.4;">${esc(d.objetivoSecundario) || "—"}</div>
  </div>
  <div style="padding:12px 0 12px 16px; border-left:1px solid ${COR.divisoria};">
    <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; color:${COR.neutro700}; margin-bottom:4px;">Linha vermelha</div>
    <div style="font-size:10pt; line-height:1.4;">${esc(d.linhaVermelha) || "—"}</div>
  </div>
</div>

<h3 style="font-weight:400; font-size:11pt; text-transform:uppercase; letter-spacing:0.06em; margin:24px 0 12px;">Próximos passos</h3>
<table style="width:100%; font-size:9.5pt;">
  <thead>
    <tr>
      <th style="text-align:left; padding:6px 12px 6px 0; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">#</th>
      <th style="text-align:left; padding:6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">Ação</th>
      <th style="text-align:left; padding:6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">Tentativas</th>
      <th style="text-align:left; padding:6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">Responsável</th>
      <th style="text-align:left; padding:6px 0 6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">Prazo</th>
    </tr>
  </thead>
  <tbody>${passosHtml || `<tr><td style="padding:8px 0; color:${COR.neutro700};">Nenhum passo registrado.</td></tr>`}</tbody>
</table>

<h3 style="font-weight:400; font-size:11pt; text-transform:uppercase; letter-spacing:0.06em; margin:32px 0 12px;">Prazos em aberto</h3>
<table style="width:100%; font-size:9.5pt;">
  <thead>
    <tr>
      <th style="text-align:left; padding:6px 12px 6px 0; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">Ato</th>
      <th style="text-align:left; padding:6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700}; width:24%;">Contagem</th>
      <th style="text-align:left; padding:6px 0 6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700}; width:22%;">Data</th>
    </tr>
  </thead>
  <tbody>${prazosHtml || `<tr><td style="padding:8px 0; color:${COR.neutro700};">Nenhum prazo em aberto.</td></tr>`}</tbody>
</table>

<div style="display:flex; align-items:baseline; gap:16px; border-top:1px solid ${COR.acento}; margin-top:32px; padding-top:12px;">
  <div style="font-weight:300; font-size:22pt; line-height:1; color:${COR.acento};">03</div>
  <h2 style="font-weight:400; font-size:15pt; letter-spacing:0.05em; margin:0; text-transform:uppercase;">Argumentos e embasamento</h2>
</div>
${argumentosHtml || `<p style="font-size:10pt; color:${COR.neutro700};">Nenhum argumento registrado.</p>`}

<div class="keep" style="margin-top:32px;">
  <h3 style="font-weight:400; font-size:11pt; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 12px;">Histórico de atualizações</h3>
  <table style="width:100%; font-size:9.5pt;">
    <thead>
      <tr>
        <th style="text-align:left; padding:6px 12px 6px 0; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700}; width:10%;">Versão</th>
        <th style="text-align:left; padding:6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700}; width:16%;">Data</th>
        <th style="text-align:left; padding:6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700};">Marco</th>
        <th style="text-align:left; padding:6px 0 6px 12px; border-top:1px solid ${COR.acento}; border-bottom:1px solid ${COR.acento}; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:${COR.neutro700}; width:22%;">Revisor</th>
      </tr>
    </thead>
    <tbody>${historicoHtml}</tbody>
  </table>
</div>

</body>
</html>`;
}
