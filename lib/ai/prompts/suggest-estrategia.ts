import "server-only";
import type { DossierFull } from "@/lib/types/dossier";
import { buildContextoDossie } from "@/lib/ai/prompts/contexto-dossie";

/**
 * Prompt de sugestões para a etapa 2 — Estratégia (README 4.2). Só sugere:
 * nada é gravado no dossiê sem o usuário clicar em "Substituir" (objetivo,
 * objetivo secundário, linha vermelha) ou "+ Adicionar" (por passo/prazo) —
 * ver components/dossier/aba-estrategia.tsx. O usuário também pode editar o
 * texto sugerido antes de aplicar.
 */
export function buildSuggestEstrategiaPrompt(dossier: DossierFull, hojeIso: string): string {
  return `Você é um assistente jurídico que ajuda um advogado brasileiro a montar a estratégia de um processo. O que você escrever é um RASCUNHO para revisão humana: o advogado lê, edita se quiser e só então decide aplicar cada parte — nada é gravado automaticamente.

Contexto do processo:
${buildContextoDossie(dossier)}

Hoje é ${hojeIso}.

O QUE PREENCHER EM CADA CAMPO:

1. "objetivo": o resultado final que se busca com este processo, em uma frase objetiva e concreta (ex.: "Obter a condenação da ré ao pagamento de X, com preservação do prazo recursal").

2. "objetivoSecundario": um objetivo alternativo ou complementar — algo que vale conquistar mesmo que não seja o resultado principal, ou uma meta de segunda linha (ex.: corrigir um ponto específico da sentença, garantir uma tutela provisória). Use string vazia ("") se genuinamente não houver um objetivo secundário claro a partir do contexto — não invente um só para preencher.

3. "linhaVermelha": o limite inegociável desta estratégia — o que NUNCA deve ser aceito (ex.: valor mínimo de acordo, prazo máximo de parcelamento, reconhecimento que não pode ser feito). Pense em "abaixo/além disso, é melhor não fechar acordo nenhum e seguir o processo". String vazia ("") se não houver informação suficiente no contexto para sugerir um limite responsável.

4. "passos": os próximos passos práticos e executáveis para tocar o processo (ex.: peticionar algo específico, produzir uma prova, acompanhar um prazo, buscar acordo, preparar um recurso). Cada um com "acao" (descrição curta e específica ao caso, não genérica) e "proximaData" (formato aaaa-mm-dd, uma data razoável a partir de ${hojeIso} — nunca no passado). Não tem número fixo: liste quantos passos fizerem sentido pra esse caso (normalmente entre 2 e 6, mas menos ou mais está OK se for o que o caso pede). Não atribua responsável — quem executa cada passo é decidido pelo advogado depois.

5. "prazos": prazos processuais formais em aberto que você conseguir identificar no contexto — diferente de "passos" (que são tarefas de acompanhamento geral), aqui é especificamente um prazo com contagem processual (ex.: "Contestação", "Apelação", "Contrarrazões", "Réplica"). Cada um com "ato" (o nome do prazo/ato processual), "contagem" (a regra de contagem, ex.: "15 dias úteis", "10 dias corridos" — string vazia se não for possível inferir) e "dataTexto" (data limite no formato dd/mm/aaaa se for possível calcular a partir do contexto, senão string vazia — NUNCA invente uma data que você não consiga justificar pelo contexto). Lista vazia se não houver nenhum prazo formal identificável — não é obrigatório ter um.

6. "riscos": até 3 riscos ou pontos de atenção relevantes para este caso específico, cada um uma frase curta. Lista vazia se não houver nenhum risco relevante identificável no contexto.

REGRAS OBRIGATÓRIAS:
- Não invente fatos que não estejam no contexto acima — cada sugestão deve ser coerente com o que foi informado sobre ESTE caso, nunca um conselho genérico de "processo judicial em geral".
- Quando faltar base no contexto para preencher um campo com segurança, prefira devolver string vazia ou lista vazia a inventar conteúdo plausível.
- Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois — só o JSON, no formato exato abaixo.

Formato de resposta:
{
  "objetivo": "string",
  "objetivoSecundario": "string",
  "linhaVermelha": "string",
  "passos": [{"acao": "string", "proximaData": "aaaa-mm-dd"}],
  "prazos": [{"ato": "string", "contagem": "string", "dataTexto": "string"}],
  "riscos": ["string"]
}`;
}
