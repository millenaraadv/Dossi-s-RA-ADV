// Compartilhado entre client e server — sem "server-only".

// Espelha lib/db/schema.ts (materiaEnum) — duplicado aqui para não puxar o
// schema do Drizzle para o bundle do client. Manter em sincronia.
export const MATERIAS = [
  "Cível",
  "Trabalhista",
  "Tributário",
  "Empresarial",
  "Família e sucessões",
  "Consumidor",
] as const;

// Espelha lib/db/schema.ts (riscoEnum) — mesmo motivo do MATERIAS acima.
export const RISCOS = [
  "Favorável — êxito provável",
  "Favorável com reservas",
  "Incerto — prova em disputa",
  "Desfavorável — mitigar exposição",
  "A avaliar",
] as const;

export const ETAPAS = ["Gerais e FIRAC", "Estratégia", "Argumentos"] as const;

export const FIRAC_LETRAS = ["F", "I", "R", "A", "C"] as const;
export const FIRAC_TITULOS: Record<(typeof FIRAC_LETRAS)[number], string> = {
  F: "Facts — fatos",
  I: "Issue — questão",
  R: "Rule — regra",
  A: "Application — aplicação",
  C: "Conclusion — conclusão",
};

export type EtapaIndex = 0 | 1 | 2;

export function etapaLabel(etapa: EtapaIndex): string {
  return ETAPAS[etapa];
}
