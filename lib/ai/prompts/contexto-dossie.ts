import "server-only";
import type { DossierFull } from "@/lib/types/dossier";

/**
 * Bloco de contexto comum às duas sugestões da IA (README 4.2/4.3): matéria,
 * fase, partes, resumo e o FIRAC completo. Inclui o nome do cliente do
 * escritório de propósito — sem isso a IA não tem como saber de que lado ela
 * está sugerindo estratégia/argumentos, e pode facilmente inverter o
 * interesse (ex.: sugerir "condenar o réu" quando o réu é o próprio cliente).
 * Nunca inclui nº do processo, que não tem função estratégica aqui.
 */
export function buildContextoDossie(dossier: DossierFull): string {
  const paragrafo = (letra: "F" | "I" | "R" | "A" | "C") =>
    dossier.firac
      .filter((b) => b.letra === letra)
      .map((b) => b.paragrafo)
      .join(" ") || "(sem conteúdo)";

  return `Cliente do escritório (é o lado que devemos defender/representar — nunca o lado contrário): ${dossier.cliente}
Matéria: ${dossier.materia}
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
