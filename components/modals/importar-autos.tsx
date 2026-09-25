"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingDots } from "@/components/ui/loading-dots";

type Status = "idle" | "enviando" | "lendo" | "processando" | "erro" | "concluido";

type ImportStatusResponse = {
  status: "lendo" | "processando" | "concluido" | "erro";
  erro: string | null;
  camposFaltantes: string[];
  dossierId: string | null;
};

export function ImportarAutosModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function acompanharProgresso(importId: string) {
    for (;;) {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch(`/api/imports/${importId}`);
      if (!res.ok) {
        setStatus("erro");
        setErro("Não foi possível verificar o andamento da importação.");
        return;
      }
      const data: ImportStatusResponse = await res.json();

      if (data.status === "erro") {
        setStatus("erro");
        setErro(data.erro ?? "Não foi possível processar os autos.");
        return;
      }
      if (data.status === "concluido" && data.dossierId) {
        setStatus("concluido");
        const avisoParam =
          data.camposFaltantes.length > 0 ? `&naoLocalizados=${encodeURIComponent(data.camposFaltantes.join(","))}` : "";
        router.push(`/dossies/${data.dossierId}?aba=0${avisoParam}`);
        onClose();
        return;
      }
      setStatus(data.status === "processando" ? "processando" : "lendo");
    }
  }

  async function enviar() {
    const arquivo = fileInputRef.current?.files?.[0];
    if (!arquivo) return;

    setNomeArquivo(arquivo.name);
    setErro(null);
    setStatus("enviando");

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const res = await fetch("/api/imports", { method: "POST", body: formData });
      if (res.status !== 202) {
        const data = await res.json().catch(() => null);
        setStatus("erro");
        setErro(data?.erro ?? "Não foi possível iniciar a importação.");
        return;
      }
      const { id } = await res.json();
      setStatus("lendo");
      await acompanharProgresso(id);
    } catch {
      setStatus("erro");
      setErro("Falha de conexão ao enviar o arquivo.");
    }
  }

  const emAndamento = status === "enviando" || status === "lendo" || status === "processando";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-8"
      style={{ background: "rgba(32,30,29,0.6)" }}
      onClick={emAndamento ? undefined : onClose}
    >
      <div
        className="h-fit w-full max-w-[560px] border border-acento bg-ground p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[20px] font-light">Importar autos</h2>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-neutro-800">
          Envie o PDF ou TXT dos autos atualizados do processo. A IA lê o conteúdo e cria um novo dossiê com os campos
          já preenchidos — nada é gravado como definitivo sem você revisar. Campos que não forem encontrados no texto
          ficam marcados como &quot;não localizado nos autos&quot;, nunca são inventados.
        </p>

        {status === "idle" && (
          <div className="mt-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="w-full border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            />
          </div>
        )}

        {emAndamento && (
          <div className="mt-5 flex items-center gap-2 border-l-[3px] border-acento bg-neutro-100 px-3 py-3 text-[13.5px] text-texto">
            <span>
              {status === "enviando" && `Enviando ${nomeArquivo}…`}
              {status === "lendo" && `Lendo ${nomeArquivo}…`}
              {status === "processando" && "Extraindo as informações dos autos…"}
            </span>
            <LoadingDots />
          </div>
        )}

        {status === "erro" && erro && (
          <div className="mt-5 border-l-[3px] border-acento bg-tinta-clara px-3 py-3 text-[13.5px] text-acento-profundo">
            {erro}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={emAndamento}
            className="border border-acento bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-texto hover:bg-neutro-200 disabled:opacity-60"
          >
            Fechar
          </button>
          {(status === "idle" || status === "erro") && (
            <button
              type="button"
              onClick={enviar}
              className="bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-acento-escuro"
            >
              Importar
            </button>
          )}
          {status === "enviando" && (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
            >
              Carregando arquivo <LoadingDots />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
