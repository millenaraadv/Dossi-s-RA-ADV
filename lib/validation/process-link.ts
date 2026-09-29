import { z } from "zod";
import { tipoVinculoProcessualEnum } from "@/lib/db/schema";

export const tipoVinculoSchema = z.enum(tipoVinculoProcessualEnum.enumValues);

export const createProcessLinkSchema = z.object({
  tipo: tipoVinculoSchema,
  numeroProcesso: z.string().nullable().optional(),
  tribunalInstancia: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  resumo: z.string().nullable().optional(),
  resultado: z.string().nullable().optional(),
  prazoContagem: z.string().nullable().optional(),
  prazoDataTexto: z.string().nullable().optional(),
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
});
