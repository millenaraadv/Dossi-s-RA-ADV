import { z } from "zod";
import { materiaEnum, riscoEnum } from "@/lib/db/schema";

export const materiaSchema = z.enum(materiaEnum.enumValues);
export const riscoSchema = z.enum(riscoEnum.enumValues);

export const createDossierSchema = z.object({
  cliente: z.string().trim().min(1),
  caso: z.string().trim().min(1),
  numeroProcesso: z.string().trim().min(1),
  materia: materiaSchema,
  responsavelId: z.string().uuid().nullable().optional(),
});

export const patchDossierSchema = z.object({
  cliente: z.string().trim().min(1).optional(),
  caso: z.string().trim().min(1).optional(),
  numeroProcesso: z.string().trim().min(1).optional(),
  materia: materiaSchema.optional(),
  fase: z.string().nullable().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  risco: riscoSchema.optional(),
  valorCausa: z.string().nullable().optional(),
  orgao: z.string().nullable().optional(),
  juiz: z.string().nullable().optional(),
  partes: z.string().nullable().optional(),
  advogadoContrario: z.string().nullable().optional(),
  resumo: z.string().nullable().optional(),
  objetivo: z.string().nullable().optional(),
  objetivoSecundario: z.string().nullable().optional(),
  linhaVermelha: z.string().nullable().optional(),
  // Casado por label, não por id — assim funciona mesmo quando a matéria (e
  // portanto o conjunto de labels) muda no mesmo PATCH.
  camposEspecificos: z.array(z.object({ label: z.string(), valor: z.string() })).optional(),
});

export const timelineReplaceSchema = z.array(
  z.object({
    dataTexto: z.string().trim().min(1),
    ato: z.string().trim().min(1),
  }),
);

export const firacReplaceSchema = z.object({
  f: z.array(z.string().trim().min(1)),
  i: z.array(z.string().trim().min(1)),
  r: z.array(z.string().trim().min(1)),
  a: z.array(z.string().trim().min(1)),
  c: z.array(z.string().trim().min(1)),
});

export const argumentsReplaceSchema = z.array(
  z.object({
    titulo: z.string().trim().min(1),
    fato: z.string().nullable().optional(),
    previsaoLegal: z.string().nullable().optional(),
    jurisprudencia: z.string().nullable().optional(),
    doutrina: z.string().nullable().optional(),
  }),
);

export const concludeEditSchema = z.object({
  etapa: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
