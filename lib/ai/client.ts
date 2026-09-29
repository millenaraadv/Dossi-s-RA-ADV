import "server-only";
import { GoogleGenAI, ApiError } from "@google/genai";
import { AiError } from "@/lib/errors";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada.");
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// A disputa por capacidade na cota gratuita do Gemini agora é generalizada
// (testado na prática: até modelos "lite" tomam 503 de vez em quando) — não
// existe modelo que nunca sofra com isso. O apelido "-latest" piora a
// situação porque aponta pro modelo mais novo do catálogo, justamente pra
// onde a cota gratuita do mundo inteiro migra assim que ele sai (todo mundo
// disputando o mesmo modelo). Por isso os dois nomes abaixo são versões
// específicas, escolhidas testando o sucesso real de várias chamadas
// seguidas contra esta chave (não o que o catálogo lista como "disponível" —
// modelos mais antigos como a série 2.5 aparecem no catálogo mas retornam
// 404 "no longer available to new users" nesta conta).
//
// Modelo reserva entra só quando o principal falha por sobrecarga (503) ou
// cota diária esgotada (429 RESOURCE_EXHAUSTED) — a cota gratuita é contada
// por modelo, então um modelo diferente tem cota própria, intacta, e por ser
// um modelo diferente tem uma chance real de não estar sofrendo a mesma
// sobrecarga no mesmo instante. É a variante "lite": mais barata, e dá conta
// bem do formato JSON estruturado que pedimos (extração/sugestão).
//
// Ver o catálogo atual em GET https://generativelanguage.googleapis.com/v1beta/models
// se algum dia um dos dois sair de linha — e testar de verdade antes de
// trocar, não só conferir se aparece na lista.
const MODELO_PRINCIPAL = "gemini-3.6-flash";
const MODELO_RESERVA = "gemini-3.1-flash-lite";

const TENTATIVAS_POR_MODELO = 2;
const ESPERA_ENTRE_TENTATIVAS_MS = 1000;

// Sem um timeout explícito por chamada, uma chamada "pendurada" no provedor
// consumiria sozinha o tempo do proxy do Render (que devolve um 502 cru,
// sem a mensagem amigável, se a rota demorar demais pra responder) — pior do
// que simplesmente ela falhar rápido e a gente cair pro próximo modelo. Quem
// chama pode alargar isso (ver processImport, que roda em segundo plano e
// não tem esse limite de proxy).
const TIMEOUT_PADRAO_MS = 15_000;

// A mensagem do ApiError é o corpo bruto da resposta HTTP, stringificado
// (ver node_modules/@google/genai/dist/index.mjs, throwErrorIfNotOK) — nunca
// texto pensado para aparecer para o usuário final.
function corpoDoErro(err: ApiError): { message?: string; status?: string } | null {
  try {
    return JSON.parse(err.message)?.error ?? null;
  } catch {
    return null;
  }
}

// 429 cobre dois casos bem diferentes: limite de requisições por minuto (vale
// tentar de novo em segundos) e cota diária gratuita esgotada
// (RESOURCE_EXHAUSTED) — essa última não se resolve dentro da mesma
// requisição/modelo, então repetir só atrasa um erro que já é certo (mas
// trocar de MODELO ainda pode funcionar — cada modelo tem cota própria).
function ehLimiteDeCotaEsgotada(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 429) return false;
  return corpoDoErro(err)?.status === "RESOURCE_EXHAUSTED";
}

// Estourar o `httpOptions.timeout` não gera um ApiError — o fetch interno do
// SDK aborta via AbortController e rejeita com um DOMException genérico
// ("This operation was aborted"), sem status HTTP nenhum. Testado na
// prática: sem tratar isso à parte, um timeout escapava por baixo de todo
// mundo (ApiError, err.status) e nunca contava como transitório — nem
// repetia no mesmo modelo, nem caía pro modelo reserva.
function ehTimeout(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function ehErroTransitorio(err: unknown): boolean {
  if (ehTimeout(err)) return true;
  if (!(err instanceof ApiError)) return false;
  if (err.status === 503) return true;
  return err.status === 429 && !ehLimiteDeCotaEsgotada(err);
}

// Sobrecarga ou cota esgotada do modelo principal justificam tentar o modelo
// reserva; qualquer outro erro (chave inválida, prompt malformado etc.)
// falharia do mesmo jeito no reserva, então não vale a pena tentar de novo.
function valeTentarReserva(err: unknown): boolean {
  return ehErroTransitorio(err) || ehLimiteDeCotaEsgotada(err);
}

// Converte o erro do provedor numa mensagem em português que faça sentido
// pra quem está usando o sistema — sem isso, o usuário via o JSON bruto da
// API do Gemini na tela (código, links de documentação, etc.).
function mensagemAmigavel(err: unknown): string {
  if (ehTimeout(err)) {
    return "O Gemini demorou demais para responder. Tente novamente em instantes.";
  }
  if (err instanceof ApiError) {
    if (ehLimiteDeCotaEsgotada(err)) {
      return "Limite gratuito diário do Gemini foi atingido. Tente novamente mais tarde — a cota é renovada a cada 24h.";
    }
    if (err.status === 503) {
      return "O Gemini está temporariamente sobrecarregado (alta demanda). Tente novamente em alguns minutos.";
    }
    if (err.status === 429) {
      return "Limite de requisições por minuto do Gemini atingido. Tente novamente em instantes.";
    }
    return corpoDoErro(err)?.message ?? "Não foi possível obter resposta da IA.";
  }
  return err instanceof Error ? err.message : "Erro desconhecido ao chamar a IA.";
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chama um modelo específico com uma config arbitrária, repetindo (com
 * espera curta) só em erro transitório (503 / 429 de limite de taxa) — cota
 * esgotada (429 RESOURCE_EXHAUSTED) já falha na primeira tentativa, já que
 * repetir no mesmo modelo não resolveria.
 */
async function chamarModeloBruto(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  config: Record<string, unknown>,
  timeoutMs: number,
) {
  for (let tentativa = 1; tentativa <= TENTATIVAS_POR_MODELO; tentativa++) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: { ...config, httpOptions: { timeout: timeoutMs } },
      });
    } catch (err) {
      const ultimaTentativa = tentativa === TENTATIVAS_POR_MODELO;
      if (!ehErroTransitorio(err) || ultimaTentativa) throw err;
      await esperar(ESPERA_ENTRE_TENTATIVAS_MS);
    }
  }

  throw new Error("Não foi possível obter resposta da IA.");
}

async function chamarModelo(ai: GoogleGenAI, model: string, prompt: string, timeoutMs: number): Promise<string> {
  const response = await chamarModeloBruto(ai, model, prompt, { responseMimeType: "application/json", temperature: 0.1 }, timeoutMs);
  const texto = response.text;
  if (!texto) throw new Error("A IA não retornou conteúdo.");
  return texto;
}

export type Fonte = { titulo: string; url: string };
export type RespostaComFontes = { texto: string; fontes: Fonte[] };

// Não pede responseMimeType "application/json" junto com a busca: a
// documentação do Gemini não deixa claro se JSON mode e a ferramenta de
// busca (grounding) são compatíveis na mesma chamada, e testar ao vivo não
// deu (cota diária esgotada durante o desenvolvimento). Mais seguro pedir
// JSON só via instrução no prompt e extrair de forma tolerante (ver
// lib/ai/parse.ts) do que arriscar um erro 400 por combinação não suportada.
async function chamarModeloComBusca(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<RespostaComFontes> {
  const response = await chamarModeloBruto(
    ai,
    model,
    prompt,
    { temperature: 0.1, tools: [{ googleSearch: {} }] },
    timeoutMs,
  );
  const texto = response.text;
  if (!texto) throw new Error("A IA não retornou conteúdo.");

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const fontes: Fonte[] = chunks
    .map((c) => c.web)
    .filter((w): w is NonNullable<typeof w> => !!w?.uri)
    .map((w) => ({ titulo: w.title || w.uri!, url: w.uri! }));

  return { texto, fontes };
}

/**
 * Chama o Gemini pedindo saída em JSON (responseMimeType), reduzindo o risco
 * de a resposta vir com texto/markdown ao redor. Ainda assim, quem chama deve
 * tratar a resposta como não confiável e validar (ver lib/ai/parse.ts) — o
 * modo JSON do Gemini ajuda, mas não garante aderência ao formato pedido.
 *
 * Tenta o modelo principal (com repetições em erro transitório); se ainda
 * assim falhar por sobrecarga ou cota esgotada, cai para o modelo reserva
 * antes de desistir de vez.
 *
 * `timeoutMs` limita cada chamada individual (padrão 15s, pensado pra rota
 * síncrona de sugestões, que precisa responder bem antes do proxy do Render
 * cortar a conexão). processImport roda em segundo plano — sem esse limite
 * de proxy — e por isso passa um valor maior.
 */
export async function gerarJson(prompt: string, timeoutMs = TIMEOUT_PADRAO_MS): Promise<string> {
  const ai = getClient();

  try {
    return await chamarModelo(ai, MODELO_PRINCIPAL, prompt, timeoutMs);
  } catch (erroPrincipal) {
    if (!valeTentarReserva(erroPrincipal)) {
      throw new AiError(mensagemAmigavel(erroPrincipal));
    }
    try {
      return await chamarModelo(ai, MODELO_RESERVA, prompt, timeoutMs);
    } catch (erroReserva) {
      throw new AiError(mensagemAmigavel(erroReserva));
    }
  }
}

/**
 * Mesma lógica de `gerarJson` (modelo principal com fallback pro reserva em
 * sobrecarga/cota esgotada), mas habilitando a ferramenta de busca do Google
 * — usada quando a resposta precisa citar algo verificável (jurisprudência,
 * doutrina) em vez de só descrever uma tese genérica. Devolve as fontes
 * usadas pela busca junto com o texto, para o usuário poder conferir antes
 * de usar em peça — a IA pode errar mesmo com busca, então a fonte com link
 * é o que torna a conferência possível.
 */
export async function gerarComBusca(prompt: string, timeoutMs = TIMEOUT_PADRAO_MS): Promise<RespostaComFontes> {
  const ai = getClient();

  try {
    return await chamarModeloComBusca(ai, MODELO_PRINCIPAL, prompt, timeoutMs);
  } catch (erroPrincipal) {
    if (!valeTentarReserva(erroPrincipal)) {
      throw new AiError(mensagemAmigavel(erroPrincipal));
    }
    try {
      return await chamarModeloComBusca(ai, MODELO_RESERVA, prompt, timeoutMs);
    } catch (erroReserva) {
      throw new AiError(mensagemAmigavel(erroReserva));
    }
  }
}
