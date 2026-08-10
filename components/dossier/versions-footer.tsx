"use client";

import { useState } from "react";
import type { DossierFull } from "@/lib/types/dossier";
import { formatarDataBr } from "@/lib/dates";

type AuditTrailEntry = {
  id: string;
  entidade: string;
  acao: string;
  autor: string | null;
  criadoEm: string;
  descricao: string;
};

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return `${formatarDataBr(iso.slice(0, 10))} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function VersionsFooter({ dossier }: { dossier: DossierFull }) {
  const [aberto, setAberto] = useState(false);
  const [trilha, setTrilha] = useState<AuditTrailEntry[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function alternar() {
    const proximoAberto = !aberto;
    setAberto(proximoAberto);
    if (proximoAberto && trilha === null) {
      setCarregando(true);
      const res = await fetch(`/api/dossiers/${dossier.id}/audit`);
      if (res.ok) setTrilha(await res.json());
      setCarregando(false);
    }
  }

  return (
    <div className="mt-10">
      <button
        type="button"
        onClick={alternar}
        className="grid w-full grid-cols-4 gap-4 border-t border-acento py-4 text-left hover:bg-tinta-clara"
      >
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Atualizado em</div>
          <div className="mt-1 text-[13.5px]">{formatarDataBr(dossier.atualizadoEm.slice(0, 10))}</div>
        </div>
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Versão</div>
          <div className="mt-1 text-[13.5px]">{dossier.versao}</div>
        </div>
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            Marco da atualização
          </div>
          <div className="mt-1 text-[13.5px]">{dossier.marco || "—"}</div>
        </div>
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            Responsável pela revisão
          </div>
          <div className="mt-1 text-[13.5px]">{dossier.revisor?.nome ?? "—"}</div>
        </div>
        <div className="col-span-4 text-[11px] text-acento-escuro">
          Clique para ver o histórico de atualizações
        </div>
      </button>

      {aberto && (
        <div className="mt-2">
          {carregando ? (
            <p className="py-3 text-[13px] text-neutro-700">Carregando histórico…</p>
          ) : !trilha || trilha.length === 0 ? (
            <p className="py-3 text-[13px] text-neutro-700">Nenhuma alteração registrada ainda.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-divisoria-fina text-left text-[9.5px] uppercase tracking-[0.1em] text-neutro-700">
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2 pr-3">Quem</th>
                  <th className="py-2">O que mudou</th>
                </tr>
              </thead>
              <tbody>
                {trilha.map((item) => (
                  <tr key={item.id} className="border-b border-divisoria-fina">
                    <td className="py-2 pr-3 whitespace-nowrap text-neutro-700">{formatarDataHora(item.criadoEm)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{item.autor ?? "—"}</td>
                    <td className="py-2">{item.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
