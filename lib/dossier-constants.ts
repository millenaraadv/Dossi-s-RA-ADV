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

// Valor gravado por processImport (lib/ai/import-processor.ts) num campo que
// a IA não achou nos autos — nunca inferido, sempre esse texto exato.
export const NAO_LOCALIZADO = "não localizado nos autos";

// Rótulos em português para o aviso "a IA não localizou nos autos: X, Y"
// (README 4.1, item 5) — usado tanto ao gravar a importação (server) quanto
// ao recalcular o aviso a cada render do dossiê (client, ver dossier-view.tsx:
// precisa reler os valores atuais, não só o que veio congelado na URL de
// redirecionamento, senão o aviso não some depois que o campo é corrigido).
export const ROTULOS_CAMPOS_IMPORTADOS = {
  cliente: "Cliente",
  caso: "Caso",
  numeroProcesso: "Nº do processo",
  fase: "Fase",
  orgao: "Comarca/tribunal",
  juiz: "Magistrado",
  partes: "Partes",
  advogadoContrario: "Advogado contrário",
  valorCausa: "Valor da causa",
} as const;

export function camposNaoLocalizados(
  dossier: Partial<Record<keyof typeof ROTULOS_CAMPOS_IMPORTADOS, string | null | undefined>>,
): string[] {
  return (Object.keys(ROTULOS_CAMPOS_IMPORTADOS) as (keyof typeof ROTULOS_CAMPOS_IMPORTADOS)[])
    .filter((campo) => dossier[campo] === NAO_LOCALIZADO)
    .map((campo) => ROTULOS_CAMPOS_IMPORTADOS[campo]);
}
