import type { DossierFull } from "@/lib/types/dossier";
import { formatarDataPonto } from "@/lib/dates";

/**
 * "{cliente} - {caso} - Proc {numeroProcesso sem pontos} - {versao} - {DD.MM.YYYY}.pdf"
 * Ex.: "Metalúrgica Aurora - Cobrança Belveder - Proc 5001234-5620258240023 - v4 - 07.08.2026.pdf"
 */
export function buildDossierPdfFilename(d: DossierFull): string {
  const numeroSemPontos = d.numeroProcesso.replace(/\./g, "");
  const data = formatarDataPonto(d.atualizadoEm.slice(0, 10));
  return `${d.cliente} - ${d.caso} - Proc ${numeroSemPontos} - ${d.versao} - ${data}.pdf`;
}
