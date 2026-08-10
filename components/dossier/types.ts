export type GeraisForm = {
  materia: string;
  numeroProcesso: string;
  fase: string;
  risco: string;
  valorCausa: string;
  orgao: string;
  juiz: string;
  partes: string;
  advogadoContrario: string;
  responsavelId: string;
  resumo: string;
  camposEspecificos: { label: string; valor: string }[];
  timeline: { dataTexto: string; ato: string }[];
  firac: { f: string[]; i: string[]; r: string[]; a: string[]; c: string[] };
};

export type EstrategiaForm = {
  objetivo: string;
  objetivoSecundario: string;
  linhaVermelha: string;
};

export type ArgumentoForm = {
  titulo: string;
  fato: string;
  previsaoLegal: string;
  jurisprudencia: string;
  doutrina: string;
};
