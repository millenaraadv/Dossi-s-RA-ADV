"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MATERIAS } from "@/lib/dossier-constants";
import { capitalizarNome } from "@/lib/text";

type Membro = { id: string; nome: string; cor: string | null };

export function NovoDossieModal({
  membros,
  onClose,
}: {
  membros: Membro[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [materia, setMateria] = useState<(typeof MATERIAS)[number]>(MATERIAS[0]);
  const [cliente, setCliente] = useState("");
  const [caso, setCaso] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [responsavelId, setResponsavelId] = useState(membros[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const nomePreview =
    cliente.trim() && caso.trim() && numeroProcesso.trim()
      ? `${cliente} - ${caso} - Proc. ${numeroProcesso}`
      : "—";

  async function criar() {
    setErro(null);
    if (!cliente.trim() || !caso.trim() || !numeroProcesso.trim()) {
      setErro("Preencha cliente, caso e número do processo.");
      return;
    }
    setEnviando(true);

    const res = await fetch("/api/dossiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente, caso, numeroProcesso, materia, responsavelId: responsavelId || null }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Não foi possível criar o dossiê.");
      setEnviando(false);
      return;
    }

    const { id } = await res.json();
    onClose();
    router.push(`/dossies/${id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-8"
      style={{ background: "rgba(32,30,29,0.6)" }}
      onClick={onClose}
    >
      <div
        className="h-fit w-full max-w-[560px] border border-acento bg-ground p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[20px] font-light">Novo dossiê</h2>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Matéria</span>
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value as (typeof MATERIAS)[number])}
              className="border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            >
              {MATERIAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Cliente</span>
            <input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              onBlur={(e) => setCliente(capitalizarNome(e.target.value))}
              className="border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Caso</span>
            <input
              value={caso}
              onChange={(e) => setCaso(e.target.value)}
              className="border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
              Nº do processo
            </span>
            <input
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="0000000-00.0000.0.00.0000 ou &quot;a distribuir&quot;"
              className="border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
              Responsável
            </span>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            >
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="border-l-2 border-acento pl-3 py-1 text-[13px] text-neutro-800">{nomePreview}</div>

          {erro && (
            <div className="border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
              {erro}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-acento bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-texto hover:bg-neutro-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={criar}
            disabled={enviando}
            className="bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-acento-escuro disabled:opacity-60"
          >
            {enviando ? "Criando…" : "Criar e abrir"}
          </button>
        </div>
      </div>
    </div>
  );
}
