import "server-only";
import { z } from "zod";
import { extrairJson } from "@/lib/ai/parse";

export const importVinculoResultSchema = z.object({
  partes: z.string(),
  juiz: z.string(),
  fase: z.string(),
  valorCausa: z.string(),
  resumo: z.string(),
  firac: z.object({
    f: z.array(z.string()),
    i: z.array(z.string()),
    r: z.array(z.string()),
    a: z.array(z.string()),
    c: z.array(z.string()),
  }),
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

export type ImportVinculoResult = z.infer<typeof importVinculoResultSchema>;

export function parseImportVinculoResult(textoResposta: string): ImportVinculoResult {
  return importVinculoResultSchema.parse(extrairJson(textoResposta));
}
