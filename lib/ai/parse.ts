import "server-only";
import { z } from "zod";
import { materiaSchema } from "@/lib/validation/dossier";

export const importResultSchema = z.object({
  cliente: z.string(),
  caso: z.string(),
  numeroProcesso: z.string(),
  materia: materiaSchema,
  fase: z.string(),
  orgao: z.string(),
  juiz: z.string(),
  partes: z.string(),
  advogadoContrario: z.string(),
  valorCausa: z.string(),
  resumo: z.string(),
  timeline: z.array(z.object({ dataTexto: z.string(), ato: z.string() })),
  firac: z.object({
    f: z.array(z.string()),
    i: z.array(z.string()),
    r: z.array(z.string()),
    a: z.array(z.string()),
    c: z.array(z.string()),
  }),
});

export type ImportResult = z.infer<typeof importResultSchema>;

/**
 * Extração tolerante: pega do primeiro "{" ao último "}" da resposta, mesmo
 * que venha com texto ou markdown ao redor. O modo JSON do Gemini (ver
 * lib/ai/client.ts) já reduz muito esse risco, mas não confiamos só nisso.
 */
export function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error("A resposta da IA não contém um JSON reconhecível.");
  }
  return JSON.parse(texto.slice(inicio, fim + 1));
}

export function parseImportResult(textoResposta: string): ImportResult {
  const json = extrairJson(textoResposta);
  return importResultSchema.parse(json);
}
