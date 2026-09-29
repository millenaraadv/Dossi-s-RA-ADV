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

// Aba adicional de "Processos relacionados" — fora do fluxo versionado de
// concluir-edição das ETAPAS acima (é uma lista de CRUD imediato, como
// Passos/Prazos, não um formulário com revisão). Por isso não entra em
// ETAPAS/EtapaIndex nem em concludeEdit.
export const ABA_VINCULOS_LABEL = "Processos relacionados";

// Espelha lib/db/schema.ts (tipoVinculoProcessualEnum) — mesmo motivo do
// MATERIAS/RISCOS acima: não puxar o schema do Drizzle para o bundle do client.
export const TIPOS_VINCULO_PROCESSUAL = [
  "conexao",
  "agravo_instrumento",
  "agravo_interno",
  "recurso_especial",
  "recurso_extraordinario",
  "outro",
] as const;

export const VINCULO_TIPO_LABEL: Record<(typeof TIPOS_VINCULO_PROCESSUAL)[number], string> = {
  conexao: "Conexão / apensamento",
  agravo_instrumento: "Agravo de instrumento",
  agravo_interno: "Agravo interno",
  recurso_especial: "Recurso especial (REsp)",
  recurso_extraordinario: "Recurso extraordinário (RE)",
  outro: "Outro recurso",
};

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

// Mesmo padrão acima, para os campos de "mini-dossiê" de um processo
// vinculado preenchidos por processVinculoImport (lib/ai/import-processor-vinculo.ts).
export const ROTULOS_CAMPOS_VINCULO = {
  partes: "Partes",
  juiz: "Magistrado",
  fase: "Fase",
  valorCausa: "Valor da causa",
} as const;

export function camposVinculoNaoLocalizados(
  vinculo: Partial<Record<keyof typeof ROTULOS_CAMPOS_VINCULO, string | null | undefined>>,
): string[] {
  return (Object.keys(ROTULOS_CAMPOS_VINCULO) as (keyof typeof ROTULOS_CAMPOS_VINCULO)[])
    .filter((campo) => vinculo[campo] === NAO_LOCALIZADO)
    .map((campo) => ROTULOS_CAMPOS_VINCULO[campo]);
}
