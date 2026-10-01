import { z } from "zod";
import { tipoVinculoProcessualEnum, riscoEnum } from "@/lib/db/schema";

export const tipoVinculoSchema = z.enum(tipoVinculoProcessualEnum.enumValues);
const riscoVinculoSchema = z.enum(riscoEnum.enumValues);

export const createProcessLinkSchema = z.object({
  tipo: tipoVinculoSchema,
  numeroProcesso: z.string().nullable().optional(),
  tribunalInstancia: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  resumo: z.string().nullable().optional(),
  resultado: z.string().nullable().optional(),
  prazoContagem: z.string().nullable().optional(),
  prazoDataTexto: z.string().nullable().optional(),
  partes: z.string().nullable().optional(),
  juiz: z.string().nullable().optional(),
  fase: z.string().nullable().optional(),
  valorCausa: z.string().nullable().optional(),
  advogadoContrario: z.string().nullable().optional(),
  risco: riscoVinculoSchema.optional(),
  objetivo: z.string().nullable().optional(),
  objetivoSecundario: z.string().nullable().optional(),
  linhaVermelha: z.string().nullable().optional(),
});

export const patchProcessLinkSchema = z.object({
  tipo: tipoVinculoSchema.optional(),
  numeroProcesso: z.string().nullable().optional(),
  tribunalInstancia: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  resumo: z.string().nullable().optional(),
  resultado: z.string().nullable().optional(),
  prazoContagem: z.string().nullable().optional(),
  prazoDataTexto: z.string().nullable().optional(),
  partes: z.string().nullable().optional(),
  juiz: z.string().nullable().optional(),
  fase: z.string().nullable().optional(),
  valorCausa: z.string().nullable().optional(),
  advogadoContrario: z.string().nullable().optional(),
  risco: riscoVinculoSchema.optional(),
  objetivo: z.string().nullable().optional(),
  objetivoSecundario: z.string().nullable().optional(),
  linhaVermelha: z.string().nullable().optional(),
  // Casado por label, não por id (mesmo motivo de patchDossierSchema).
  camposEspecificos: z.array(z.object({ label: z.string(), valor: z.string() })).optional(),
});
