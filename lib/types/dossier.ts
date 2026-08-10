// Tipo explícito para o retorno de getDossierFull (lib/db/queries/dossiers.ts).
//
// Por que não `Awaited<ReturnType<typeof getDossierFull>>`: o inferenciador de
// tipos do Drizzle confunde a coluna `users.id` (que tem sua própria FK para
// `auth.users`) com o alvo das relações `one(users, ...)` — toda relação para
// `users` (dossiers.responsavel/revisor, steps.responsavel,
// dossierVersions.revisor) acaba tipada como `{ id: string }` em vez da linha
// completa. É só um bug de tipagem: em runtime o join já traz o usuário
// inteiro (conferido via curl). Este tipo explícito é o shape real.
export type UsuarioRef = { id: string; nome: string; cor: string | null } | null;

export type DossierFull = {
  id: string;
  cliente: string;
  caso: string;
  numeroProcesso: string;
  nome: string;
  materia: string;
  fase: string | null;
  responsavelId: string | null;
  responsavel: UsuarioRef;
  risco: string;
  valorCausa: string | null;
  orgao: string | null;
  juiz: string | null;
  partes: string | null;
  advogadoContrario: string | null;
  resumo: string | null;
  objetivo: string | null;
  objetivoSecundario: string | null;
  linhaVermelha: string | null;
  versao: string;
  marco: string | null;
  revisorId: string | null;
  revisor: UsuarioRef;
  atualizadoEm: string;
  arquivado: boolean;
  criadoEm: string;
  camposEspecificos: { id: string; label: string; valor: string; ordem: number }[];
  timeline: { id: string; dataTexto: string; data: string | null; ato: string; ordem: number }[];
  firac: { id: string; letra: "F" | "I" | "R" | "A" | "C"; paragrafo: string; ordem: number }[];
  passos: {
    id: string;
    acao: string;
    responsavelId: string | null;
    responsavel: UsuarioRef;
    proximaData: string | null;
    concluido: boolean;
    ordem: number;
    tentativas: { id: string; data: string; resultado: string; criadoEm: string }[];
  }[];
  prazos: {
    id: string;
    ato: string;
    contagem: string | null;
    dataTexto: string | null;
    redacaoOk: boolean;
    redacaoLink: string | null;
    correcaoOk: boolean;
    protocoloOk: boolean;
    protocoloData: string | null;
    ordem: number;
  }[];
  argumentos: {
    id: string;
    tag: string;
    titulo: string;
    fato: string | null;
    previsaoLegal: string | null;
    jurisprudencia: string | null;
    doutrina: string | null;
    ordem: number;
  }[];
  versoes: { id: string; versao: string; data: string; marco: string | null; etapa: string | null; revisor: UsuarioRef }[];
};
