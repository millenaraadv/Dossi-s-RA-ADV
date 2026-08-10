export type EventoAberto = {
  id: string;
  acao: string;
  proximaData: string;
  dossierId: string;
  cliente: string;
  caso: string;
  numeroProcesso: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  responsavelCor: string | null;
};

export type EventoRealizado = {
  id: string;
  data: string;
  resultado: string;
  acao: string;
  dossierId: string;
  cliente: string;
  caso: string;
  numeroProcesso: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  responsavelCor: string | null;
  registradoPorNome: string | null;
};

export type CalendarResponse = {
  abertos: EventoAberto[];
  realizadas: EventoRealizado[];
  range: {
    label: string;
    weeks?: string[][];
    monthStart?: string;
    monthEnd?: string;
    days?: string[];
  };
};
