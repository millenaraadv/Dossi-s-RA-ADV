"use client";

import { useState } from "react";
import { formatarDataBr, estaAtrasada } from "@/lib/dates";
import { updateStep, deleteStep, addAttempt } from "@/lib/client/dossier-api";
import type { DossierFull } from "@/lib/types/dossier";

type Passo = DossierFull["passos"][number];
type Membro = { id: string; nome: string; cor: string | null };

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1 text-[13px] text-texto outline-none";

export function PassoRow({
  passo,
  isEditing,
  podeRegistrarTentativa,
  membros,
  onChanged,
}: {
  passo: Passo;
  isEditing: boolean;
  podeRegistrarTentativa: boolean;
  membros: Membro[];
  onChanged: () => Promise<void>;
}) {
  const [tentativaAberta, setTentativaAberta] = useState(false);
  const [tentativaData, setTentativaData] = useState("");
  const [tentativaResultado, setTentativaResultado] = useState("");
  const [salvando, setSalvando] = useState(false);

  const texto = formatarDataBr(passo.proximaData);
  const atrasada = estaAtrasada(passo.proximaData);

  async function alternarConcluido() {
    setSalvando(true);
    try {
      await updateStep(passo.id, { concluido: !passo.concluido });
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  async function registrarTentativa() {
    if (!tentativaData.trim() || !tentativaResultado.trim()) return;
    setSalvando(true);
    try {
      await addAttempt(passo.id, { data: tentativaData, resultado: tentativaResultado });
      setTentativaAberta(false);
      setTentativaData("");
      setTentativaResultado("");
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setSalvando(true);
    try {
      await deleteStep(passo.id);
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  if (isEditing) {
    return (
      <div className="grid grid-cols-[1fr_200px_140px_auto] items-start gap-2 border-b border-divisoria-fina py-3">
        <input
          className={inputClass}
          defaultValue={passo.acao}
          onBlur={(e) => e.target.value !== passo.acao && updateStep(passo.id, { acao: e.target.value }).then(onChanged)}
        />
        <select
          className={inputClass}
          defaultValue={passo.responsavelId ?? ""}
          onChange={(e) => updateStep(passo.id, { responsavelId: e.target.value || null }).then(onChanged)}
        >
          <option value="">—</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={inputClass}
          defaultValue={passo.proximaData ?? ""}
          onChange={(e) => updateStep(passo.id, { proximaData: e.target.value || null }).then(onChanged)}
        />
        <button
          type="button"
          onClick={excluir}
          disabled={salvando}
          className="border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-[1fr_300px_150px] gap-4 border-b border-divisoria-fina py-3 ${passo.concluido ? "bg-fora-do-mes" : ""}`}
    >
      <div>
        <div className={`text-[14px] ${passo.concluido ? "line-through text-neutro-700" : ""}`}>{passo.acao}</div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-neutro-700">
          {passo.responsavel && (
            <span className="inline-block h-2 w-2" style={{ background: passo.responsavel.cor ?? "#B3A8A2" }} />
          )}
          {passo.responsavel?.nome ?? "—"} · {passo.concluido ? "concluído" : "em aberto"}
        </div>
        {podeRegistrarTentativa && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={alternarConcluido}
              disabled={salvando}
              className="border border-acento px-2 py-1 text-[10.5px] font-semibold uppercase text-texto hover:bg-neutro-200 disabled:opacity-60"
            >
              {passo.concluido ? "Reabrir" : "Concluir"}
            </button>
            <button
              type="button"
              onClick={() => setTentativaAberta((v) => !v)}
              className="border border-acento px-2 py-1 text-[10.5px] font-semibold uppercase text-texto hover:bg-neutro-200"
            >
              + Tentativa
            </button>
          </div>
        )}
        {tentativaAberta && (
          <div className="mt-2 flex flex-col gap-2 border-l-[3px] border-ambar bg-tinta-clara p-2">
            <input
              type="date"
              value={tentativaData}
              onChange={(e) => setTentativaData(e.target.value)}
              className={inputClass}
            />
            <textarea
              rows={2}
              placeholder="Resultado da tentativa"
              value={tentativaResultado}
              onChange={(e) => setTentativaResultado(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={registrarTentativa}
              disabled={salvando}
              className="self-start bg-acento px-3 py-1 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
            >
              Registrar
            </button>
          </div>
        )}
      </div>
      <div className="text-[13px] text-neutro-800">
        {passo.tentativas.length === 0 ? (
          "Nenhuma ainda"
        ) : (
          <ul className="flex flex-col gap-1">
            {passo.tentativas.map((t) => (
              <li key={t.id}>
                <strong>{formatarDataBr(t.data)}</strong> — {t.resultado}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={`text-[13px] font-semibold ${atrasada && !passo.concluido ? "text-acento-escuro" : ""}`}>
        {texto}
      </div>
    </div>
  );
}
