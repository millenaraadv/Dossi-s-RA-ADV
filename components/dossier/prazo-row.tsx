"use client";

import { useState } from "react";
import { updateDeadline, deleteDeadline } from "@/lib/client/dossier-api";
import type { DossierFull } from "@/lib/types/dossier";
import { normalizarDataDigitada } from "@/lib/dates";

type Prazo = DossierFull["prazos"][number];
type Membro = { id: string; nome: string; cor: string | null };

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1 text-[12.5px] text-texto outline-none";

function Coluna({
  numero,
  titulo,
  concluida,
  children,
}: {
  numero: number;
  titulo: string;
  concluida: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 pl-3" style={{ borderLeftColor: concluida ? "var(--acento)" : "var(--borda-campo)" }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-neutro-700">
        {numero} · {titulo}
      </div>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function PrazoRow({
  prazo,
  isEditing,
  podeMarcar,
  membros,
  onChanged,
}: {
  prazo: Prazo;
  isEditing: boolean;
  podeMarcar: boolean;
  membros: Membro[];
  onChanged: () => Promise<void>;
}) {
  const [salvando, setSalvando] = useState(false);
  const [link, setLink] = useState(prazo.redacaoLink ?? "");
  const [protocoloData, setProtocoloData] = useState(prazo.protocoloData ?? "");
  const [dataTexto, setDataTexto] = useState(prazo.dataTexto ?? "");

  async function marcar(patch: Parameters<typeof updateDeadline>[1]) {
    setSalvando(true);
    try {
      await updateDeadline(prazo.id, patch);
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setSalvando(true);
    try {
      await deleteDeadline(prazo.id);
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  if (isEditing) {
    return (
      <div className="border-b border-divisoria-fina py-3">
        <div className="grid grid-cols-[1fr_150px_150px_auto] items-start gap-2">
          <input
            className={inputClass}
            defaultValue={prazo.ato}
            onBlur={(e) => e.target.value !== prazo.ato && updateDeadline(prazo.id, { ato: e.target.value }).then(onChanged)}
          />
          <input
            className={inputClass}
            placeholder="Contagem"
            defaultValue={prazo.contagem ?? ""}
            onBlur={(e) => updateDeadline(prazo.id, { contagem: e.target.value || null }).then(onChanged)}
          />
          <input
            className={inputClass}
            placeholder="Data"
            value={dataTexto}
            onChange={(e) => setDataTexto(e.target.value)}
            onBlur={(e) => {
              const normalizada = normalizarDataDigitada(e.target.value);
              setDataTexto(normalizada);
              if (normalizada !== (prazo.dataTexto ?? "")) {
                updateDeadline(prazo.id, { dataTexto: normalizada || null }).then(onChanged);
              }
            }}
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
      </div>
    );
  }

  return (
    <div className="border-b border-divisoria-fina py-4">
      <div className="text-[13.5px]">
        {prazo.ato} <span className="text-neutro-700">· {prazo.contagem} · {prazo.dataTexto}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4">
        <Coluna numero={1} titulo="Redação" concluida={prazo.redacaoOk}>
          {podeMarcar && (
            <button
              type="button"
              onClick={() => marcar({ redacaoOk: !prazo.redacaoOk })}
              disabled={salvando}
              className="self-start border border-acento px-2 py-1 text-[10.5px] font-semibold uppercase text-texto hover:bg-neutro-200 disabled:opacity-60"
            >
              {prazo.redacaoOk ? "Concluída" : "Marcar"}
            </button>
          )}
          <input
            placeholder="Link do Word"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onBlur={() => link !== (prazo.redacaoLink ?? "") && marcar({ redacaoLink: link || null })}
            className={inputClass}
          />
          {prazo.redacaoLink && (
            <a href={prazo.redacaoLink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-acento-escuro">
              Abrir minuta
            </a>
          )}
        </Coluna>

        <Coluna numero={2} titulo="Correção" concluida={prazo.correcaoOk}>
          {podeMarcar && (
            <button
              type="button"
              onClick={() => marcar({ correcaoOk: !prazo.correcaoOk })}
              disabled={salvando}
              className="self-start border border-acento px-2 py-1 text-[10.5px] font-semibold uppercase text-texto hover:bg-neutro-200 disabled:opacity-60"
            >
              {prazo.correcaoOk ? "Concluída" : "Marcar"}
            </button>
          )}
          <select
            className={inputClass}
            defaultValue={""}
            onChange={(e) => marcar({ correcaoPorId: e.target.value || null })}
          >
            <option value="">Quem corrigiu —</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Coluna>

        <Coluna numero={3} titulo="Protocolo" concluida={prazo.protocoloOk}>
          {podeMarcar && (
            <button
              type="button"
              onClick={() => marcar({ protocoloOk: !prazo.protocoloOk })}
              disabled={salvando}
              className="self-start border border-acento px-2 py-1 text-[10.5px] font-semibold uppercase text-texto hover:bg-neutro-200 disabled:opacity-60"
            >
              {prazo.protocoloOk ? "Protocolado" : "Marcar"}
            </button>
          )}
          <input
            type="date"
            value={protocoloData}
            onChange={(e) => setProtocoloData(e.target.value)}
            onBlur={() => protocoloData !== (prazo.protocoloData ?? "") && marcar({ protocoloData: protocoloData || null })}
            className={inputClass}
          />
        </Coluna>
      </div>
    </div>
  );
}
