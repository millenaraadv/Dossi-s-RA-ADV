import "server-only";
import { MATERIAS } from "@/lib/dossier-constants";

/**
 * Prompt da importação de autos (README Parte 4.1). Regras não-negociáveis do
 * projeto embutidas aqui: nunca inventar dado identificador, nunca citar
 * precedente sem certeza, string vazia quando a informação não está no texto.
 */
export function buildImportPrompt(textoAutos: string): string {
  return `Você é um assistente jurídico que lê os autos de um processo judicial brasileiro e extrai informações estruturadas para o sistema interno de um escritório de advocacia.

REGRAS OBRIGATÓRIAS — siga à risca:
1. NUNCA invente número de processo, data, valor da causa, ou nome de pessoa/empresa. Se a informação não estiver clara e explícita no texto abaixo, retorne string vazia ("") para esse campo — não tente adivinhar ou completar.
2. NUNCA cite jurisprudência, súmula ou número de julgado que você não tenha certeza de que existe de verdade. No campo "r" do FIRAC, se for relevante mencionar um precedente e você não tiver certeza absoluta da citação exata, escreva "a conferir" em vez de inventar uma referência.
3. "materia" é obrigatório e deve ser exatamente uma destas opções (escolha a mais próxima mesmo com dúvida, nunca deixe vazio): ${MATERIAS.join(", ")}.
4. "resumo": até 5 frases, em português, resumindo o caso para alguém que ainda não o conhece.
5. "firac": 1 a 3 parágrafos por letra (f, i, r, a, c), em português, cada parágrafo como um item separado no array. Se não houver conteúdo suficiente para alguma letra, retorne um array vazio para ela — não invente conteúdo para preencher.
6. "timeline": lista das movimentações processuais relevantes encontradas no texto, cada uma com "dataTexto" (formato dd/mm/aaaa quando a data estiver clara) e "ato" (descrição curta). Lista vazia se não houver nenhuma identificável.
7. Responda APENAS com um objeto JSON válido, sem markdown (sem \`\`\`), sem texto antes ou depois — só o JSON, no formato exato abaixo.

Formato de resposta:
{
  "cliente": "string — nome do cliente do escritório (pessoa física ou jurídica), ou \\"\\" se não identificado",
  "caso": "string — descrição curta do caso, ex: 'Cobrança de honorários', ou \\"\\"",
  "numeroProcesso": "string — número do processo no formato CNJ, ou \\"\\"",
  "materia": "uma das opções listadas na regra 3",
  "fase": "string — fase processual atual, ou \\"\\"",
  "orgao": "string — comarca/vara/tribunal, ou \\"\\"",
  "juiz": "string — nome do magistrado, ou \\"\\"",
  "partes": "string — descrição das partes, ex: 'Fulano Ltda. × Beltrano', ou \\"\\"",
  "advogadoContrario": "string — nome do advogado da parte contrária, ou \\"\\"",
  "valorCausa": "string — valor da causa como aparece nos autos, ou \\"\\"",
  "resumo": "string",
  "timeline": [{"dataTexto": "string", "ato": "string"}],
  "firac": {
    "f": ["string"],
    "i": ["string"],
    "r": ["string"],
    "a": ["string"],
    "c": ["string"]
  }
}

AUTOS DO PROCESSO (texto extraído do arquivo enviado):
"""
${textoAutos}
"""`;
}
