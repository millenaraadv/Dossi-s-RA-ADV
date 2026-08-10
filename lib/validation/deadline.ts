import { z } from "zod";

export const createDeadlineSchema = z.object({
  ato: z.string().trim().min(1),
  contagem: z.string().nullable().optional(),
  dataTexto: z.string().nullable().optional(),
});

export const patchDeadlineSchema = z.object({
  // Conteúdo — exige canEditDossierContent.
  ato: z.string().trim().min(1).optional(),
  contagem: z.string().nullable().optional(),
  dataTexto: z.string().nullable().optional(),
  // As três etapas do workflow — exige canMarkDeadlineStage.
  redacaoOk: z.boolean().optional(),
  redacaoLink: z.string().nullable().optional(),
  correcaoOk: z.boolean().optional(),
  correcaoPorId: z.string().uuid().nullable().optional(),
  protocoloOk: z.boolean().optional(),
  protocoloData: z.string().nullable().optional(),
});

const CAMPOS_CONTEUDO = ["ato", "contagem", "dataTexto"] as const;

export function temCamposDeConteudo(patch: z.infer<typeof patchDeadlineSchema>): boolean {
  return CAMPOS_CONTEUDO.some((campo) => campo in patch);
}
