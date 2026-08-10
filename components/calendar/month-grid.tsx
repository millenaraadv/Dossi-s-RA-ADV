"use client";

import { DIAS } from "@/lib/calendar";
import { hojeIso } from "@/lib/dates";
import type { EventoAberto } from "@/components/calendar/types";

const FALLBACK_COR = "#B3A8A2";
const FALLBACK_TINTA = "#FAF6F3";
const ALTURA_CELULA = 96;

export function MonthGrid({
  weeks,
  monthStart,
  monthEnd,
  abertos,
  onEventClick,
  onDayClick,
}: {
  weeks: string[][];
  monthStart: string;
  monthEnd: string;
  abertos: EventoAberto[];
  onEventClick: (evento: EventoAberto) => void;
  onDayClick: (dia: string, eventos: EventoAberto[]) => void;
}) {
  const hoje = hojeIso();
  const porDia = new Map<string, EventoAberto[]>();
  for (const ev of abertos) {
    const lista = porDia.get(ev.proximaData) ?? [];
    lista.push(ev);
    porDia.set(ev.proximaData, lista);
  }

  return (
    <div>
      <div className="grid grid-cols-7">
        {DIAS.map((d) => (
          <div key={d} className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutro-700">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((diaIso) => {
            const foraDoMes = diaIso < monthStart || diaIso > monthEnd;
            const ehHoje = diaIso === hoje;
            const numero = Number(diaIso.slice(8, 10));
            const eventos = porDia.get(diaIso) ?? [];
            // Com mais de uma demanda, clicar em qualquer uma abre a lista do
            // dia (mais fácil de acertar o clique do que num bloco minúsculo);
            // com só uma, vai direto ao resumo.
            const temVarias = eventos.length > 1;
            return (
              <div
                key={diaIso}
                className="flex flex-col border border-divisoria-fina p-1.5"
                style={{ height: ALTURA_CELULA, background: foraDoMes ? "var(--fora-do-mes)" : undefined }}
              >
                <div
                  className="shrink-0 text-[12px]"
                  style={{ color: foraDoMes ? "var(--desabilitado)" : ehHoje ? "var(--acento)" : undefined }}
                >
                  {numero}
                </div>
                <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                  {eventos.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => (temVarias ? onDayClick(diaIso, eventos) : onEventClick(ev))}
                      className="w-full shrink-0 border-l-2 px-1 py-0.5 text-left"
                      style={{
                        borderLeftColor: ev.responsavelCor ?? FALLBACK_COR,
                        background: ev.responsavelCor ? `${ev.responsavelCor}22` : FALLBACK_TINTA,
                      }}
                    >
                      <div className="truncate text-[9px] font-semibold leading-tight">{ev.acao}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <p className="mt-3 text-[11.5px] text-neutro-700">A grade traz só demandas em aberto.</p>
    </div>
  );
}
