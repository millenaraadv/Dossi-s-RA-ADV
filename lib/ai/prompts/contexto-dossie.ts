import "server-only";
import type { DossierFull } from "@/lib/types/dossier";

/**
 * Bloco de contexto comum às duas sugestões da IA (README 4.2/4.3): matéria,
 * fase, partes, resumo e o FIRAC completo — nunca os dados de identificação
 * (cliente, nº do processo) já que a IA não precisa deles para sugerir
 * estratégia ou argumentos, e menos dado exposto ao prompt é mais seguro.
 */
export function buildContextoDossie(dossier: DossierFull): string {
  const paragrafo = (letra: "F" | "I" | "R" | "A" | "C") =>
    dossier.firac
      .filter((b) => b.letra === letra)
      .map((b) => b.paragrafo)
      .join(" ") || "(sem conteúdo)";

  return `Matéria: ${dossier.materia}
Fase: ${dossier.fase || "(não informada)"}
Partes: ${dossier.partes || "(não informadas)"}
Resumo do caso: ${dossier.resumo || "(sem resumo)"}

FIRAC:
- Fatos: ${paragrafo("F")}
- Questão: ${paragrafo("I")}
- Regra: ${paragrafo("R")}
- Aplicação: ${paragrafo("A")}
- Conclusão: ${paragrafo("C")}`;
}
