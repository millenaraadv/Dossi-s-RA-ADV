"use client";

import { useEffect, useMemo, useState } from "react";
import { hojeIso, formatarDataBr, estaAtrasada } from "@/lib/dates";
import { shiftMonth, shiftWeek } from "@/lib/calendar";
import { nomeCurto } from "@/lib/text";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekColumns } from "@/components/calendar/week-columns";
import { EventoModal } from "@/components/calendar/evento-modal";
import { DayListModal } from "@/components/calendar/day-list-modal";
import type { CalendarResponse, EventoAberto, EventoRealizado } from "@/components/calendar/types";

type Membro = { id: string; nome: string; cor: string | null };
type Modo = "mes" | "semana";

const FALLBACK_COR = "#B3A8A2";

export function CalendarView({
  dadosIniciais,
  refInicial,
  membros,
}: {
  dadosIniciais: CalendarResponse;
  refInicial: string;
  membros: Membro[];
}) {
  const [modo, setModo] = useState<Modo>("mes");
  const [ref, setRef] = useState(refInicial);
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [soAtrasadas, setSoAtrasadas] = useState(false);
  const [dados, setDados] = useState<CalendarResponse>(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoAberto | EventoRealizado | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<{ dia: string; eventos: EventoAberto[] } | null>(null);

  useEffect(() => {
    let ativo = true;

    const timer = setTimeout(() => {
      setCarregando(true);
      const params = new URLSearchParams({ mode: modo, ref });
      if (responsavel) params.set("responsavel", responsavel);

      fetch(`/api/calendar?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (ativo) setDados(data);
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
    }, 0);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [modo, ref, responsavel]);

  const abertosFiltrados = useMemo(
    () => (soAtrasadas ? dados.abertos.filter((ev) => estaAtrasada(ev.proximaData)) : dados.abertos),
    [dados.abertos, soAtrasadas],
  );

  function navegar(delta: number) {
    setRef((atual) => (modo === "mes" ? shiftMonth(atual, delta) : shiftWeek(atual, delta)));
  }

  function abrirResumo(evento: EventoAberto | EventoRealizado) {
    setEventoSelecionado(evento);
  }

  function abrirListaDoDia(dia: string, eventos: EventoAberto[]) {
    setDiaSelecionado({ dia, eventos });
  }

  function selecionarDaLista(evento: EventoAberto) {
    setDiaSelecionado(null);
    setEventoSelecionado(evento);
  }

  return (
    <main className="mx-auto max-w-[1240px] p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[34px] font-light tracking-[0.06em]">Calendário</h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navegar(-1)}
            className="flex h-[34px] w-[34px] items-center justify-center border border-acento"
          >
            ‹
          </button>
          <span className="min-w-[210px] text-center text-[14px]">{dados.range.label}</span>
          <button
            type="button"
            onClick={() => navegar(1)}
            className="flex h-[34px] w-[34px] items-center justify-center border border-acento"
          >
            ›
          </button>

          <div className="ml-4 flex">
            <button
              type="button"
              onClick={() => {
                setModo("mes");
                setRef(hojeIso());
              }}
              className={`px-3 py-1.5 text-[11.5px] font-semibold uppercase ${
                modo === "mes" ? "bg-acento text-white" : "bg-transparent text-texto"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("semana");
                setRef(hojeIso());
              }}
              className={`px-3 py-1.5 text-[11.5px] font-semibold uppercase ${
                modo === "semana" ? "bg-acento text-white" : "bg-transparent text-texto"
              }`}
            >
              Semana
            </button>
          </div>

          <a
            href={`/api/calendar/pdf?${new URLSearchParams({ mode: modo, ref, ...(responsavel ? { responsavel } : {}) }).toString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 border border-acento bg-transparent px-3 py-1.5 text-[11.5px] font-semibold uppercase text-texto hover:bg-neutro-200"
          >
            Imprimir
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setResponsavel(null)}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase ${
              responsavel === null ? "bg-acento text-white" : "bg-transparent text-texto"
            }`}
          >
            Todos
          </button>
          {membros.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setResponsavel(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase ${
                responsavel === m.id ? "bg-acento text-white" : "bg-transparent text-texto"
              }`}
            >
              <span className="inline-block h-2 w-2" style={{ background: m.cor ?? FALLBACK_COR }} />
              {nomeCurto(m.nome)}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSoAtrasadas((v) => !v)}
            className={`ml-2 border px-3 py-1.5 text-[11px] font-semibold uppercase ${
              soAtrasadas ? "border-acento-escuro bg-acento-escuro text-white" : "border-acento-escuro bg-transparent text-acento-escuro"
            }`}
          >
            Atrasadas
          </button>
        </div>
      </div>

      <div className={`mt-6 ${carregando ? "opacity-60" : ""}`}>
        {modo === "mes" && dados.range.weeks && dados.range.monthStart && dados.range.monthEnd ? (
          <div className="grid grid-cols-[1fr_300px] gap-8">
            <MonthGrid
              weeks={dados.range.weeks}
              monthStart={dados.range.monthStart}
              monthEnd={dados.range.monthEnd}
              abertos={abertosFiltrados}
              onEventClick={abrirResumo}
              onDayClick={abrirListaDoDia}
            />
            <div>
              <h3 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-neutro-700">Realizadas no período</h3>
              {dados.realizadas.length === 0 ? (
                <p className="text-[13.5px] text-neutro-700">Nenhuma tentativa registrada.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {dados.realizadas.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => abrirResumo(r)}
                      className="border-b border-divisoria-fina pb-3 text-left hover:bg-neutro-200"
                    >
                      <div className="text-[12px] font-semibold text-neutro-700">{formatarDataBr(r.data)}</div>
                      <div className="text-[13px]">{r.acao}</div>
                      <div className="text-[12.5px] text-neutro-700">{r.resultado}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <WeekColumns abertos={abertosFiltrados} realizadas={dados.realizadas} onEventClick={abrirResumo} />
        )}
      </div>

      {diaSelecionado && (
        <DayListModal
          dia={diaSelecionado.dia}
          eventos={diaSelecionado.eventos}
          onSelectEvento={selecionarDaLista}
          onClose={() => setDiaSelecionado(null)}
        />
      )}

      {eventoSelecionado && (
        <EventoModal evento={eventoSelecionado} onClose={() => setEventoSelecionado(null)} />
      )}
    </main>
  );
}
