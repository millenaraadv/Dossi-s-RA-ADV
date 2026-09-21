import "server-only";
import { GoogleGenAI, ApiError } from "@google/genai";

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

// "gemini-flash-latest" é o apelido que o próprio Google mantém sempre
// apontando para o modelo "flash" vigente (cota gratuita generosa, contexto
// grande o bastante para autos processuais) — evita ter que atualizar esta
// constante toda vez que um modelo específico (ex.: "gemini-3.6-flash") sai
// de linha. Se mesmo assim algum dia parar de funcionar, veja o catálogo
// atual em GET https://generativelanguage.googleapis.com/v1beta/models.
const MODEL = "gemini-flash-latest";

const TENTATIVAS = 3;
const ESPERA_BASE_MS = 2000;

function ehErroTransitorio(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 503 || err.status === 429);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chama o Gemini pedindo saída em JSON (responseMimeType), reduzindo o risco
 * de a resposta vir com texto/markdown ao redor. Ainda assim, quem chama deve
 * tratar a resposta como não confiável e validar (ver lib/ai/parse.ts) — o
 * modo JSON do Gemini ajuda, mas não garante aderência ao formato pedido.
 *
 * Repete a chamada (com espera crescente) em erro transitório do provedor
 * (503 "sobrecarregado" / 429 "limite de taxa") — comuns em modelos novos ou
 * na cota gratuita. Outros erros (ex.: chave inválida, modelo inexistente)
 * não são repetidos, já que tentar de novo não resolveria.
 */
export async function gerarJson(prompt: string): Promise<string> {
  const ai = getClient();

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const texto = response.text;
      if (!texto) throw new Error("A IA não retornou conteúdo.");
      return texto;
    } catch (err) {
      const ultimaTentativa = tentativa === TENTATIVAS;
      if (!ehErroTransitorio(err) || ultimaTentativa) throw err;
      await esperar(ESPERA_BASE_MS * tentativa);
    }
  }

  throw new Error("Não foi possível obter resposta da IA.");
}
