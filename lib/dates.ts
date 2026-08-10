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
