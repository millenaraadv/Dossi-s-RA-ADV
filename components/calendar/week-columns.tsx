"use client";

import { formatarDataBr, estaAtrasada } from "@/lib/dates";
import type { EventoAberto, EventoRealizado } from "@/components/calendar/types";

const FALLBACK_COR = "#B3A8A2";

export function WeekColumns({
  abertos,
  realizadas,
  onEventClick,
}: {
  abertos: EventoAberto[];
  realizadas: EventoRealizado[];
  onEventClick: (evento: EventoAberto | EventoRealizado) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h3 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-neutro-700">Em aberto</h3>
        {abertos.length === 0 ? (
          <p className="text-[13.5px] text-neutro-700">Nenhuma demanda em aberto nesta semana.</p>
        ) : (
          <div className="flex flex-col">
            {abertos.map((ev) => {
              const atrasada = estaAtrasada(ev.proximaData);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className="grid grid-cols-[96px_1fr] gap-3 border-b border-divisoria-fina py-3 pl-3 text-left hover:bg-neutro-200"
                  style={{ borderLeft: `3px solid ${ev.responsavelCor ?? FALLBACK_COR}` }}
                >
                  <span className={`text-[12px] font-semibold ${atrasada ? "text-acento-escuro" : "text-neutro-700"}`}>
                    {formatarDataBr(ev.proximaData)}
                  </span>
                  <span className="text-[13.5px]">
                    {ev.acao}
                    <span className="text-neutro-700"> — {ev.caso} · {ev.responsavelNome ?? "—"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-neutro-700">Realizadas</h3>
        {realizadas.length === 0 ? (
          <p className="text-[13.5px] text-neutro-700">Nenhuma tentativa registrada nesta semana.</p>
        ) : (
          <div className="flex flex-col">
            {realizadas.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                className="grid grid-cols-[96px_1fr] gap-3 border-b border-divisoria-fina py-3 pl-3 text-left hover:bg-neutro-200"
                style={{ borderLeft: `3px solid ${ev.responsavelCor ?? FALLBACK_COR}` }}
              >
                <span className="text-[12px] font-semibold text-neutro-700">{formatarDataBr(ev.data)}</span>
                <span className="text-[13.5px]">
                  {ev.acao}
                  <span className="text-neutro-700"> — {ev.caso} · {ev.resultado}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
