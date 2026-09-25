import "server-only";
import type { DossierFull } from "@/lib/types/dossier";
import { buildContextoDossie } from "@/lib/ai/prompts/contexto-dossie";

/**
 * Prompt de sugestões para a etapa 3 — Argumentos (README 4.3). Salvaguarda
 * obrigatória: proíbe citar número de precedente, já que modelos alucinam
 * jurisprudência com frequência e uma citação falsa em peça protocolada é
 * falta grave — a IA descreve a tese e escreve "a conferir" no lugar da
 * citação exata. Nada é gravado sem o usuário clicar em "+ Adicionar" (ver
 * components/dossier/aba-argumentos.tsx).
 */
export function buildSuggestArgumentosPrompt(dossier: DossierFull): string {
  return `Você é um assistente jurídico que sugere linhas de argumentação para um advogado brasileiro revisar. Sua sugestão é só um rascunho para revisão humana — o advogado decide o que aceitar, e jurisprudência/doutrina sugeridas sempre precisam ser conferidas antes de qualquer uso em peça.

Contexto do processo:
${buildContextoDossie(dossier)}

REGRAS OBRIGATÓRIAS:
1. "argumentos": de 2 a 4 linhas de argumentação, cada uma com "titulo" (curto), "fato" (o fato do caso que sustenta esse argumento), "previsaoLegal" (dispositivo legal aplicável, ex.: "art. 927, Código Civil"), "jurisprudencia" e "doutrina".
2. NUNCA cite número de julgado, súmula ou acórdão específico — mesmo que pareça familiar, você pode estar errado ou o precedente pode não existir. No campo "jurisprudencia", descreva só a TESE jurisprudencial aplicável (ex.: "Tribunais superiores entendem que..."). PROIBIDO incluir, nesse campo ou em qualquer outro, sigla de recurso (REsp, AgInt, AREsp, RE, AI, HC etc.), nome de relator ("Rel. Min.", "Rel. Des."), número de processo, data de julgamento ou nome de tribunal seguido de número — mesmo com "a conferir" do lado. Se não tiver uma tese genérica segura para citar, escreva apenas "Tese a levantar com a equipe — nenhum precedente identificado com segurança."
3. "doutrina": pode citar uma linha doutrinária ou autor de referência conhecido na área, mas sem inventar título de obra específico que você não tenha certeza de que existe — na dúvida, descreva a posição doutrinária sem citar a obra.
4. Não invente fatos que não estejam no contexto acima.
5. Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois — só o JSON, no formato exato abaixo.

Formato de resposta:
{
  "argumentos": [
    {"titulo": "string", "fato": "string", "previsaoLegal": "string", "jurisprudencia": "string", "doutrina": "string"}
  ]
}`;
}
