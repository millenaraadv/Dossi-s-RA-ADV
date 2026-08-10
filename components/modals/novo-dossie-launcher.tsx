"use client";

import { useState } from "react";
import { NovoDossieModal } from "@/components/modals/novo-dossie";

type Membro = { id: string; nome: string; cor: string | null };

export function NovoDossieLauncher({ membros }: { membros: Membro[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-white hover:bg-acento-escuro"
      >
        Novo dossiê
      </button>
      {aberto && <NovoDossieModal membros={membros} onClose={() => setAberto(false)} />}
    </>
  );
}
