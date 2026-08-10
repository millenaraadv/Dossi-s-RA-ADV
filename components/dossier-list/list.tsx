"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DossierListItem, OrdemLista } from "@/lib/db/queries/dossier-list";
import { formatarDataBr, estaAtrasada } from "@/lib/dates";
import { nomeCurto } from "@/lib/text";

type Membro = { id: string; nome: string; cor: string | null };

const FALLBACK_COR = "#B3A8A2";

export function DossiesList({
  itensIniciais,
  totalInicial,
  membros,
}: {
  itensIniciais: DossierListItem[];
  totalInicial: number;
  membros: Membro[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<OrdemLista>("alfabetica");
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [itens, setItens] = useState(itensIniciais);
  const [total, setTotal] = useState(totalInicial);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCarregando(true);
      const params = new URLSearchParams({ ordem });
      if (busca.trim()) params.set("q", busca.trim());
      if (responsavel) params.set("responsavel", responsavel);

      const res = await fetch(`/api/dossiers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItens(data.itens);
        setTotal(data.total);
      }
      setCarregando(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busca, ordem, responsavel]);

  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[34px] font-light tracking-[0.06em]">Dossiês</h1>
        <div className="flex items-center gap-4">
          <div className="flex">
            <button
              type="button"
              onClick={() => setOrdem("alfabetica")}
              className={`px-3 py-1.5 text-[11.5px] font-semibold uppercase ${
                ordem === "alfabetica" ? "bg-acento text-white" : "bg-transparent text-texto"
              }`}
            >
              A – Z
            </button>
            <button
              type="button"
              onClick={() => setOrdem("recente")}
              className={`px-3 py-1.5 text-[11.5px] font-semibold uppercase ${
                ordem === "recente" ? "bg-acento text-white" : "bg-transparent text-texto"
              }`}
            >
              Demanda mais recente
            </button>
          </div>
          <span className="text-[12px] uppercase text-neutro-700">
            {itens.length} de {total} processos
          </span>
        </div>
      </div>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por cliente, caso, nº do processo, matéria ou responsável"
        className="mt-6 w-full border-0 border-b border-acento bg-transparent py-3 text-[15px] text-texto outline-none placeholder:text-neutro-700"
      />

      <div className="mt-4 flex flex-wrap gap-2">
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
      </div>

      <div className={`mt-4 flex flex-col ${carregando ? "opacity-60" : ""}`}>
        {itens.length === 0 ? (
          <p className="py-8 text-[14px] text-neutro-800">Nenhum dossiê corresponde à busca.</p>
        ) : (
          itens.map((item) => {
            const atrasada = estaAtrasada(item.proximaData);
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dossies/${item.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/dossies/${item.id}`)}
                className="grid grid-cols-[1fr_250px] gap-6 border-b border-divisoria-fina py-4 pl-3 pr-3 hover:bg-neutro-200"
                style={{ borderLeft: `5px solid ${item.responsavelCor ?? FALLBACK_COR}`, cursor: "pointer" }}
              >
                <div>
                  <div className="text-[16px] font-semibold leading-[1.3]">{item.nome}</div>
                  <div className="mt-1 text-[12.5px] text-neutro-700">
                    {item.responsavelNome ?? "Sem responsável"} · {item.fase ?? "—"} · {item.materia}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-neutro-700">Próxima demanda</div>
                  {item.proximaAcao ? (
                    <>
                      <div className="text-[13px]">{item.proximaAcao}</div>
                      <div className={`text-[13px] font-semibold ${atrasada ? "text-acento-escuro" : "text-texto"}`}>
                        {formatarDataBr(item.proximaData)}
                      </div>
                    </>
                  ) : (
                    <div className="text-[13px] text-neutro-700">Nenhuma em aberto</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
