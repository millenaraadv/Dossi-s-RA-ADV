"use client";

import { useState } from "react";
import { ImportarAutosModal } from "@/components/modals/importar-autos";

export function ImportarAutosLauncher() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="border border-acento bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-acento-escuro hover:bg-tinta-clara"
      >
        Importar autos
      </button>
      {aberto && <ImportarAutosModal onClose={() => setAberto(false)} />}
    </>
  );
}
