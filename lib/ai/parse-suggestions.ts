import "server-only";
import { z } from "zod";
import { extrairJson } from "@/lib/ai/parse";

export const sugestaoEstrategiaSchema = z.object({
  objetivo: z.string(),
  passos: z.array(z.object({ acao: z.string(), proximaData: z.string() })),
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
export type SugestaoArgumentos = z.infer<typeof sugestaoArgumentosSchema>;

export function parseSugestaoEstrategia(textoResposta: string): SugestaoEstrategia {
  return sugestaoEstrategiaSchema.parse(extrairJson(textoResposta));
}

// Rede de segurança além do prompt (README 4.3: "modelos alucinam
// jurisprudência com frequência"). Testado na prática: o modelo às vezes
// obedece a instrução de escrever "a conferir" só como um prefixo e mesmo
// assim inclui número de recurso/relator/data reais (quase sempre inventados)
// — a instrução no prompt sozinha não é suficiente. Qualquer texto que pareça
// citação específica é substituído por um aviso genérico, nunca exibido.
const PADRAO_CITACAO_ESPECIFICA =
  /\b(REsp|AgInt|AgRg|AREsp|ARE|RE|AI|HC|MS|ADI|ADPF|RHC|EDcl)\b|\bRel\.?\s*(Min|Des)\b|\d{1,3}(?:\.\d{3})+\/[A-Z]{2}\b|\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/i;

const AVISO_CITACAO_BLOQUEADA =
  "A IA tentou citar um julgado específico — bloqueado por segurança (risco de jurisprudência inventada). Pesquise a tese com a equipe antes de usar.";

function semCitacaoEspecifica(jurisprudencia: string): string {
  return PADRAO_CITACAO_ESPECIFICA.test(jurisprudencia) ? AVISO_CITACAO_BLOQUEADA : jurisprudencia;
}

export function parseSugestaoArgumentos(textoResposta: string): SugestaoArgumentos {
  const resultado = sugestaoArgumentosSchema.parse(extrairJson(textoResposta));
  return {
    argumentos: resultado.argumentos.map((a) => ({ ...a, jurisprudencia: semCitacaoEspecifica(a.jurisprudencia) })),
  };
}
