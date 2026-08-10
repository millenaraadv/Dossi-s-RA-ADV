// Cálculo de intervalos mês/semana — compartilhado entre client e server,
// sem "server-only". A busca dos eventos em si mora em
// lib/db/queries/calendar.ts (server-only).
import { formatarDataBr } from "@/lib/dates";

export const MESES = [
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

export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(d: Date): Date {
  const dia = d.getDay(); // 0=dom, 1=seg, ...
  const diff = dia === 0 ? -6 : 1 - dia;
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  return result;
}

export type MonthGrid = {
  gridStart: string;
  gridEnd: string;
  monthStart: string;
  monthEnd: string;
  weeks: string[][];
  label: string;
};

export function getMonthGrid(refIso: string): MonthGrid {
  const ref = parseIso(refIso);
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const gridStart = mondayOf(monthStart);
  const gridEnd = mondayOf(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + 6);

  const weeks: string[][] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toIso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return {
    gridStart: toIso(gridStart),
    gridEnd: toIso(gridEnd),
    monthStart: toIso(monthStart),
    monthEnd: toIso(monthEnd),
    weeks,
    label: `${MESES[ref.getMonth()]} de ${ref.getFullYear()}`,
  };
}

export type WeekRange = {
  start: string;
  end: string;
  days: string[];
  label: string;
};

export function getWeekRange(refIso: string): WeekRange {
  const ref = parseIso(refIso);
  const start = mondayOf(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const days: string[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 7; i++) {
    days.push(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const startIso = toIso(start);
  const endIso = toIso(end);
  return { start: startIso, end: endIso, days, label: `${formatarDataBr(startIso)} a ${formatarDataBr(endIso)}` };
}

export function shiftMonth(refIso: string, delta: number): string {
  const ref = parseIso(refIso);
  return toIso(new Date(ref.getFullYear(), ref.getMonth() + delta, 1));
}

export function shiftWeek(refIso: string, deltaWeeks: number): string {
  const ref = parseIso(refIso);
  const next = new Date(ref);
  next.setDate(ref.getDate() + deltaWeeks * 7);
  return toIso(next);
}
