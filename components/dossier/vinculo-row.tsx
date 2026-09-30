"use client";

import { VINCULO_TIPO_LABEL } from "@/lib/dossier-constants";
import type { DossierFull } from "@/lib/types/dossier";

type Vinculo = DossierFull["vinculos"][number];

export function VinculoRow({ vinculo, onClick }: { vinculo: Vinculo; onClick: () => void }) {
  const rotulo = VINCULO_TIPO_LABEL[vinculo.tipo as keyof typeof VINCULO_TIPO_LABEL] ?? vinculo.tipo;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1 border-b border-divisoria-fina py-3 text-left hover:bg-neutro-100"
    >
      <div className="text-[13.5px]">
        <span className="font-semibold">{rotulo}</span>
        {vinculo.numeroProcesso && <span className="text-neutro-700"> · nº {vinculo.numeroProcesso}</span>}
        {vinculo.tribunalInstancia && <span className="text-neutro-700"> · {vinculo.tribunalInstancia}</span>}
      </div>
      <div className="text-[12px] text-neutro-700">
        {vinculo.status || "Sem status registrado"}
        {vinculo.arquivoAnexoNome && <span> · PDF anexado</span>}
      </div>
    </button>
  );
}
