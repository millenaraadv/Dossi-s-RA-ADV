"use client";

import { useState } from "react";
import { createProcessLink } from "@/lib/client/dossier-api";
import { TIPOS_VINCULO_PROCESSUAL, VINCULO_TIPO_LABEL } from "@/lib/dossier-constants";
import { VinculoRow } from "@/components/dossier/vinculo-row";
import type { DossierFull } from "@/lib/types/dossier";
import { LoadingDots } from "@/components/ui/loading-dots";

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1.5 text-[13px] text-texto outline-none";

export function AbaVinculos({
  dossier,
  podeEditar,
  onChanged,
}: {
  dossier: DossierFull;
  podeEditar: boolean;
  onChanged: () => Promise<void>;
}) {
  const [novoAberto, setNovoAberto] = useState(false);
  const [tipo, setTipo] = useState<(typeof TIPOS_VINCULO_PROCESSUAL)[number]>("conexao");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [tribunalInstancia, setTribunalInstancia] = useState("");
  const [criando, setCriando] = useState(false);

  async function adicionar() {
    setCriando(true);
    try {
      await createProcessLink(dossier.id, {
        tipo,
        numeroProcesso: numeroProcesso || null,
        tribunalInstancia: tribunalInstancia || null,
        status: null,
        resumo: null,
        resultado: null,
        prazoContagem: null,
        prazoDataTexto: null,
        partes: null,
        juiz: null,
        fase: null,
        valorCausa: null,
      });
      setNovoAberto(false);
      setTipo("conexao");
      setNumeroProcesso("");
      setTribunalInstancia("");
      await onChanged();
    } finally {
      setCriando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-normal">Processos relacionados</h2>
      </div>

      <div className="border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
        Registre aqui processos conexos/apensados e recursos que geram número próprio (agravo de instrumento, agravo
        interno, REsp, RE etc.), para manter o histórico de tudo que corre em paralelo a este dossiê.
      </div>

      {dossier.vinculos.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-neutro-700">Nenhum vínculo processual registrado.</p>
      ) : (
        <div className="mt-6 flex flex-col">
          {dossier.vinculos.map((v) => (
            <VinculoRow key={v.id} vinculo={v} podeEditar={podeEditar} onChanged={onChanged} />
          ))}
        </div>
      )}

      {podeEditar && (
        <div className="mt-4">
          {novoAberto ? (
            <div className="flex flex-col gap-2 border-l-[3px] border-acento bg-neutro-100 p-3">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as (typeof TIPOS_VINCULO_PROCESSUAL)[number])}
                className={inputClass}
              >
                {TIPOS_VINCULO_PROCESSUAL.map((t) => (
                  <option key={t} value={t}>
                    {VINCULO_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
              <input
                placeholder="Nº do processo (se já houver)"
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Tribunal/instância"
                value={tribunalInstancia}
                onChange={(e) => setTribunalInstancia(e.target.value)}
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={adicionar}
                  disabled={criando}
                  className="inline-flex items-center gap-2 self-start bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
                >
                  Adicionar {criando && <LoadingDots />}
                </button>
                <button
                  type="button"
                  onClick={() => setNovoAberto(false)}
                  className="self-start border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNovoAberto(true)}
              className="border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-tinta-clara"
            >
              + Adicionar processo vinculado
            </button>
          )}
        </div>
      )}
    </div>
  );
}
