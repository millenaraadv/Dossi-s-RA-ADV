import "server-only";
import { z } from "zod";
import { extrairJson } from "@/lib/ai/parse";

export const sugestaoEstrategiaSchema = z.object({
  objetivo: z.string(),
  objetivoSecundario: z.string(),
  linhaVermelha: z.string(),
  passos: z.array(z.object({ acao: z.string(), proximaData: z.string() })),
  prazos: z.array(z.object({ ato: z.string(), contagem: z.string(), dataTexto: z.string() })),
  riscos: z.array(z.string()),
});
export type SugestaoEstrategia = z.infer<typeof sugestaoEstrategiaSchema>;

export const sugestaoArgumentosSchema = z.object({
  argumentos: z.array(
    z.object({
      titulo: z.string(),
      fato: z.string(),
      previsaoLegal: z.string(),
      jurisprudencia: z.string(),
      doutrina: z.string(),
    }),
  ),
});
export type SugestaoArgumentos = z.infer<typeof sugestaoArgumentosSchema> & {
  fontes: { titulo: string; url: string }[];
};

export function parseSugestaoEstrategia(textoResposta: string): SugestaoEstrategia {
  return sugestaoEstrategiaSchema.parse(extrairJson(textoResposta));
}

// Rede de segurança além do prompt (README 4.3: "modelos alucinam
// jurisprudência com frequência"). Testado na prática: o modelo às vezes
// obedece a instrução de escrever "a conferir" só como um prefixo e mesmo
// assim inclui número de recurso/relator/data reais (quase sempre inventados)
// — a instrução no prompt sozinha não é suficiente. Qualquer texto que pareça
// citação específica é substituído por um aviso genérico, nunca exibido —
// A MENOS que a chamada tenha usado busca de verdade (ver `temFontes`
// abaixo): aí a citação pode vir de uma fonte real, e bloquear indiscrimi-
// nadamente jogaria fora exatamente o que foi pedido (README: usuário quer
// uma ementa/citação real, não só a tese). Sem busca, continua bloqueando
// como antes — resposta sem fonte nenhuma pra conferir é sempre tratada
// como possível invenção.
const PADRAO_CITACAO_ESPECIFICA =
  /\b(REsp|AgInt|AgRg|AREsp|ARE|RE|AI|HC|MS|ADI|ADPF|RHC|EDcl)\b|\bRel\.?\s*(Min|Des)\b|\d{1,3}(?:\.\d{3})+\/[A-Z]{2}\b|\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/i;

const AVISO_CITACAO_BLOQUEADA =
  "A IA tentou citar um julgado específico sem confirmar por busca — bloqueado por segurança (risco de jurisprudência inventada). Peça a sugestão de novo ou pesquise a tese com a equipe.";

function semCitacaoEspecifica(jurisprudencia: string, temFontes: boolean): string {
  if (temFontes) return jurisprudencia;
  return PADRAO_CITACAO_ESPECIFICA.test(jurisprudencia) ? AVISO_CITACAO_BLOQUEADA : jurisprudencia;
}

export function parseSugestaoArgumentos(
  textoResposta: string,
  fontes: { titulo: string; url: string }[] = [],
): SugestaoArgumentos {
  const resultado = sugestaoArgumentosSchema.parse(extrairJson(textoResposta));
  const temFontes = fontes.length > 0;
  return {
    argumentos: resultado.argumentos.map((a) => ({
      ...a,
      jurisprudencia: semCitacaoEspecifica(a.jurisprudencia, temFontes),
    })),
    fontes,
  };
}
