"use client";

import { useRouter } from "next/navigation";
import { formatarDataBr, estaAtrasada } from "@/lib/dates";
import type { EventoAberto, EventoRealizado } from "@/components/calendar/types";

const FALLBACK_COR = "#B3A8A2";

export function EventoModal({
  evento,
  onClose,
}: {
  evento: EventoAberto | EventoRealizado;
  onClose: () => void;
}) {
  const router = useRouter();
  const aberto = "proximaData" in evento;
  const data = aberto ? evento.proximaData : evento.data;
  const atrasada = aberto && estaAtrasada(evento.proximaData);

  function irParaDossie() {
    router.push(`/dossies/${evento.dossierId}?aba=1`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-8"
      style={{ background: "rgba(32,30,29,0.6)" }}
      onClick={onClose}
    >
      <div className="h-fit w-full max-w-[560px] border border-acento bg-ground p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro">
          {evento.cliente} - {evento.caso}
        </div>
        <div className="mt-0.5 text-[12px] tracking-[0.05em] text-neutro-700">Proc. {evento.numeroProcesso}</div>
        <h2 className="mt-2 text-[18px] font-normal leading-[1.3]">{evento.acao}</h2>

        <div className="mt-5 flex flex-col gap-3">
          <div>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Responsável</div>
            <div className="mt-1 flex items-center gap-2 text-[14px]">
              <span className="inline-block h-2 w-2" style={{ background: evento.responsavelCor ?? FALLBACK_COR }} />
              {evento.responsavelNome ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
              {aberto ? "Próxima data" : "Concluída em"}
            </div>
            <div className={`mt-1 text-[14px] font-semibold ${atrasada ? "text-acento-escuro" : ""}`}>
              {formatarDataBr(data)}
            </div>
          </div>

          {!aberto && (
            <>
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
                  Registrado por
                </div>
                <p className="mt-1 text-[14px]">{evento.registradoPorNome ?? "—"}</p>
              </div>
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Resultado</div>
                <p className="mt-1 text-[14px]">{evento.resultado}</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-acento bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-texto hover:bg-neutro-200"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={irParaDossie}
            className="bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-acento-escuro"
          >
            Ir para o dossiê
          </button>
        </div>
      </div>
    </div>
  );
}
