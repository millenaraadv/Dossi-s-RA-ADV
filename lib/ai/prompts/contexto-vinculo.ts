import "server-only";
import { VINCULO_TIPO_LABEL } from "@/lib/dossier-constants";

type VinculoComContexto = {
  tipo: string;
  numeroProcesso: string | null;
  tribunalInstancia: string | null;
  partes: string | null;
  fase: string | null;
  resumo: string | null;
  resultado: string | null;
  firac: { letra: "F" | "I" | "R" | "A" | "C"; paragrafo: string }[];
  dossier: { cliente: string };
};

/**
 * Bloco de contexto pras sugestões de IA (estratégia/argumentos) dentro de um
 * processo VINCULADO — mesmo papel de buildContextoDossie (lib/ai/prompts/
 * contexto-dossie.ts), mas montado a partir dos campos do vínculo, não do
 * dossiê principal. O cliente do escritório vem do dossiê pai (o vínculo não
 * tem campo próprio de cliente — é o mesmo cliente do caso principal), pelo
 * mesmo motivo já documentado lá: sem isso a IA não sabe de que lado
 * defender.
 */
export function buildContextoVinculo(vinculo: VinculoComContexto): string {
  const paragrafo = (letra: "F" | "I" | "R" | "A" | "C") =>
    vinculo.firac
      .filter((b) => b.letra === letra)
      .map((b) => b.paragrafo)
      .join(" ") || "(sem conteúdo)";

  const tipoLabel = VINCULO_TIPO_LABEL[vinculo.tipo as keyof typeof VINCULO_TIPO_LABEL] ?? vinculo.tipo;

  return `Cliente do escritório (é o lado que devemos defender/representar — nunca o lado contrário): ${vinculo.dossier.cliente}
Este é um processo VINCULADO a outro processo principal do mesmo cliente — tipo: ${tipoLabel}${vinculo.numeroProcesso ? ` (nº ${vinculo.numeroProcesso})` : ""}.
Tribunal/instância: ${vinculo.tribunalInstancia || "(não informado)"}
Partes: ${vinculo.partes || "(não informadas)"}
Fase: ${vinculo.fase || "(não informada)"}
Resumo: ${vinculo.resumo || "(sem resumo)"}
Resultado/decisão até agora: ${vinculo.resultado || "(ainda sem resultado)"}

FIRAC:
- Fatos: ${paragrafo("F")}
- Questão: ${paragrafo("I")}
- Regra: ${paragrafo("R")}
- Aplicação: ${paragrafo("A")}
- Conclusão: ${paragrafo("C")}`;
}
