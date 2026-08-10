import { z } from "zod";

export const createStepSchema = z.object({
  acao: z.string().trim().min(1),
  responsavelId: z.string().uuid().nullable().optional(),
  proximaData: z.string().nullable().optional(),
});

export const patchStepSchema = z.object({
  acao: z.string().trim().min(1).optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  proximaData: z.string().nullable().optional(),
  concluido: z.boolean().optional(),
});

export const createAttemptSchema = z.object({
  data: z.string().min(1),
  resultado: z.string().trim().min(1),
});
