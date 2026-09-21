import "server-only";
import { GoogleGenAI } from "@google/genai";

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

// "Flash" tem a cota gratuita mais generosa e contexto grande o bastante para
// autos processuais. Se o nome do modelo mudar no catálogo do Gemini (o
// catálogo muda com frequência), atualize só aqui.
const MODEL = "gemini-2.5-flash";

/**
 * Chama o Gemini pedindo saída em JSON (responseMimeType), reduzindo o risco
 * de a resposta vir com texto/markdown ao redor. Ainda assim, quem chama deve
 * tratar a resposta como não confiável e validar (ver lib/ai/parse.ts) — o
 * modo JSON do Gemini ajuda, mas não garante aderência ao formato pedido.
 */
export async function gerarJson(prompt: string): Promise<string> {
  const ai = getClient();
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
}
