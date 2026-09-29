"use client";

import { useState } from "react";
import { updateProcessLink, deleteProcessLink } from "@/lib/client/dossier-api";
import { normalizarDataDigitada } from "@/lib/dates";
import { TIPOS_VINCULO_PROCESSUAL, VINCULO_TIPO_LABEL } from "@/lib/dossier-constants";
import type { DossierFull } from "@/lib/types/dossier";
import { LoadingDots } from "@/components/ui/loading-dots";

type Vinculo = DossierFull["vinculos"][number];

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1 text-[12.5px] text-texto outline-none";

export function VinculoRow({
  vinculo,
  podeEditar,
  onChanged,
}: {
  vinculo: Vinculo;
  podeEditar: boolean;
  onChanged: () => Promise<void>;
}) {
  const [salvando, setSalvando] = useState(false);
  const [prazoDataTexto, setPrazoDataTexto] = useState(vinculo.prazoDataTexto ?? "");

  async function salvar(patch: Parameters<typeof updateProcessLink>[1]) {
    setSalvando(true);
    try {
      await updateProcessLink(vinculo.id, patch);
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setSalvando(true);
    try {
      await deleteProcessLink(vinculo.id);
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar) {
    const rotulo = VINCULO_TIPO_LABEL[vinculo.tipo as keyof typeof VINCULO_TIPO_LABEL] ?? vinculo.tipo;
    return (
      <div className="border-b border-divisoria-fina py-4">
        <div className="text-[13.5px]">
          <span className="font-semibold">{rotulo}</span>
          {vinculo.numeroProcesso && <span className="text-neutro-700"> · nº {vinculo.numeroProcesso}</span>}
          {vinculo.tribunalInstancia && <span className="text-neutro-700"> · {vinculo.tribunalInstancia}</span>}
        </div>
        {vinculo.status && <div className="mt-1 text-[13px] text-neutro-700">Status: {vinculo.status}</div>}
        {vinculo.resumo && <p className="mt-1 max-w-[70ch] text-[13px]">{vinculo.resumo}</p>}
        {(vinculo.prazoContagem || vinculo.prazoDataTexto) && (
          <div className="mt-1 text-[13px] text-neutro-700">
            Prazo: {vinculo.prazoContagem} {vinculo.prazoDataTexto}
          </div>
        )}
        {vinculo.resultado && <div className="mt-1 text-[13px] text-neutro-700">Resultado: {vinculo.resultado}</div>}
      </div>
    );
  }

  return (
    <div className="border-b border-divisoria-fina py-3">
      <div className="grid grid-cols-[180px_1fr_1fr_auto] items-start gap-2">
        <select
          className={inputClass}
          defaultValue={vinculo.tipo}
          onChange={(e) => salvar({ tipo: e.target.value as (typeof TIPOS_VINCULO_PROCESSUAL)[number] })}
        >
          {TIPOS_VINCULO_PROCESSUAL.map((t) => (
            <option key={t} value={t}>
              {VINCULO_TIPO_LABEL[t]}
            </option>
          ))}
        </select>
        <input
          className={inputClass}
          placeholder="Nº do processo"
          defaultValue={vinculo.numeroProcesso ?? ""}
          onBlur={(e) =>
            e.target.value !== (vinculo.numeroProcesso ?? "") && salvar({ numeroProcesso: e.target.value || null })
          }
        />
        <input
          className={inputClass}
          placeholder="Tribunal/instância"
          defaultValue={vinculo.tribunalInstancia ?? ""}
          onBlur={(e) =>
            e.target.value !== (vinculo.tribunalInstancia ?? "") &&
            salvar({ tribunalInstancia: e.target.value || null })
          }
        />
        <button
          type="button"
          onClick={excluir}
          disabled={salvando}
          className="inline-flex items-center gap-2 border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara disabled:opacity-60"
        >
          Excluir {salvando && <LoadingDots />}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          className={inputClass}
          placeholder="Status (ex.: Em trâmite)"
          defaultValue={vinculo.status ?? ""}
          onBlur={(e) => e.target.value !== (vinculo.status ?? "") && salvar({ status: e.target.value || null })}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass}
            placeholder="Contagem do prazo"
            defaultValue={vinculo.prazoContagem ?? ""}
            onBlur={(e) =>
              e.target.value !== (vinculo.prazoContagem ?? "") && salvar({ prazoContagem: e.target.value || null })
            }
          />
          <input
            className={inputClass}
            placeholder="Data (ex.: 19/08/2026)"
            value={prazoDataTexto}
            onChange={(e) => setPrazoDataTexto(e.target.value)}
            onBlur={(e) => {
              const normalizada = normalizarDataDigitada(e.target.value);
              setPrazoDataTexto(normalizada);
              if (normalizada !== (vinculo.prazoDataTexto ?? "")) salvar({ prazoDataTexto: normalizada || null });
            }}
          />
        </div>
      </div>

      <textarea
        rows={2}
        className={`mt-2 ${inputClass}`}
        placeholder="Resumo/objeto"
        defaultValue={vinculo.resumo ?? ""}
        onBlur={(e) => e.target.value !== (vinculo.resumo ?? "") && salvar({ resumo: e.target.value || null })}
      />
      <textarea
        rows={2}
        className={`mt-2 ${inputClass}`}
        placeholder="Resultado/decisão (quando houver)"
        defaultValue={vinculo.resultado ?? ""}
        onBlur={(e) => e.target.value !== (vinculo.resultado ?? "") && salvar({ resultado: e.target.value || null })}
      />
    </div>
  );
}
