"use client";

import { formatarDataBr } from "@/lib/dates";
import type { EventoAberto } from "@/components/calendar/types";

const FALLBACK_COR = "#B3A8A2";
const FALLBACK_TINTA = "#FAF6F3";

export function DayListModal({
  dia,
  eventos,
  onSelectEvento,
  onClose,
}: {
  dia: string;
  eventos: EventoAberto[];
  onSelectEvento: (evento: EventoAberto) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-8"
      style={{ background: "rgba(32,30,29,0.6)" }}
      onClick={onClose}
    >
      <div className="h-fit w-full max-w-[560px] border border-acento bg-ground p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro">
          {formatarDataBr(dia)}
        </div>
        <h2 className="mt-1 text-[18px] font-normal leading-[1.3]">
          {eventos.length} demandas em aberto
        </h2>

        <div className="mt-4 flex flex-col gap-2">
          {eventos.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelectEvento(ev)}
              className="w-full border-l-[3px] p-3 text-left hover:bg-neutro-200"
              style={{
                borderLeftColor: ev.responsavelCor ?? FALLBACK_COR,
                background: ev.responsavelCor ? `${ev.responsavelCor}22` : FALLBACK_TINTA,
              }}
            >
              <div className="text-[13px] font-semibold">{ev.acao}</div>
              <div className="mt-0.5 text-[12px] text-neutro-700">
                {ev.cliente} - {ev.caso} · {ev.responsavelNome ?? "—"}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="border border-acento bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-texto hover:bg-neutro-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
