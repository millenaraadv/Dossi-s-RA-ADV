// Compartilhado entre client e server — sem "server-only".

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatarDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function estaAtrasada(iso: string | null): boolean {
  if (!iso) return false;
  return iso < hojeIso();
}

const MESES_LONGO = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-08-07" → "07 de agosto de 2026" — usado no rodapé impresso. */
export function formatarDataLonga(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} de ${MESES_LONGO[Number(m) - 1]} de ${y}`;
}

/** "2026-08-07" → "07.08.2026" — usado no nome do arquivo do PDF. */
export function formatarDataPonto(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Reconhece uma data digitada com qualquer separador comum (barra, ponto,
 * hífen, espaço, ou só dígitos) e reescreve como dd/mm/aaaa. Quando o texto
 * não é reconhecível como data (ex.: "início de 2024"), devolve como veio —
 * datas de autos às vezes são imprecisas de propósito, então não force um
 * formato ali.
 */
export function normalizarDataDigitada(texto: string): string {
  const limpo = texto.trim();
  if (!limpo) return texto;

  const comSeparador = limpo.match(/^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2}|\d{4})$/);
  const soDigitos = limpo.match(/^(\d{2})(\d{2})(\d{2}|\d{4})$/);
  const match = comSeparador ?? soDigitos;
  if (!match) return texto;

  const [, dia, mes] = match;
  let ano = match[3];
  if (ano.length === 2) {
    const numAno = Number(ano);
    ano = String(numAno <= 79 ? 2000 + numAno : 1900 + numAno);
  }

  const diaNum = Number(dia);
  const mesNum = Number(mes);
  if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) return texto;

  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
}
