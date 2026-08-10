"use client";

import type { Dispatch, SetStateAction } from "react";
import { EditToggleButton } from "@/components/dossier/edit-toggle-button";
import type { ArgumentoForm } from "@/components/dossier/types";
import type { DossierFull } from "@/lib/types/dossier";

const inputClass = "w-full border border-borda-campo bg-neutro-100 p-2 text-[13.5px] text-texto outline-none";

export function AbaArgumentos({
  dossier,
  isEditing,
  salvando,
  form,
  setForm,
  podeEditar,
  onStartEdit,
  onCancel,
  onConcluir,
}: {
  dossier: DossierFull;
  isEditing: boolean;
  salvando: boolean;
  form: ArgumentoForm[];
  setForm: Dispatch<SetStateAction<ArgumentoForm[]>>;
  podeEditar: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onConcluir: () => void;
}) {
  function atualizar(i: number, campo: keyof ArgumentoForm, valor: string) {
    setForm((atual) => {
      const next = [...atual];
      next[i] = { ...next[i], [campo]: valor };
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-normal">Argumentos e embasamento</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Disponível a partir do item 7 da implementação"
            className="border border-ambar bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ambar disabled:opacity-60"
          >
            Sugestões da IA
          </button>
          {podeEditar && (
            <EditToggleButton
              editing={isEditing}
              salvando={salvando}
              onEdit={onStartEdit}
              onCancelar={onCancel}
              onConcluir={onConcluir}
            />
          )}
        </div>
      </div>

      <div className="border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
        Jurisprudência e doutrina precisam ser conferidas antes do protocolo.
      </div>

      {isEditing ? (
        <div className="mt-6 flex flex-col gap-6">
          {form.map((a, i) => (
            <div key={i} className="border-t border-acento pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] text-acento">A{i + 1}</span>
                <button
                  type="button"
                  onClick={() => setForm((atual) => atual.filter((_, j) => j !== i))}
                  className="border border-acento px-3 py-1 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
                >
                  Excluir argumento
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  className={inputClass}
                  placeholder="Título"
                  value={a.titulo}
                  onChange={(e) => atualizar(i, "titulo", e.target.value)}
                />
                <textarea
                  rows={3}
                  className={inputClass}
                  placeholder="Fato"
                  value={a.fato}
                  onChange={(e) => atualizar(i, "fato", e.target.value)}
                />
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Previsão legal"
                  value={a.previsaoLegal}
                  onChange={(e) => atualizar(i, "previsaoLegal", e.target.value)}
                />
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Jurisprudência"
                  value={a.jurisprudencia}
                  onChange={(e) => atualizar(i, "jurisprudencia", e.target.value)}
                />
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Doutrina"
                  value={a.doutrina}
                  onChange={(e) => atualizar(i, "doutrina", e.target.value)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm((atual) => [...atual, { titulo: "", fato: "", previsaoLegal: "", jurisprudencia: "", doutrina: "" }])
            }
            className="self-start border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-tinta-clara"
          >
            + Novo argumento
          </button>
        </div>
      ) : dossier.argumentos.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-neutro-700">Nenhum argumento registrado.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {dossier.argumentos.map((a) => (
            <div key={a.id} className="border-t border-acento pt-4">
              <span className="text-[13px] text-acento">{a.tag}</span>
              <h3 className="mt-1 text-[16px] font-normal">{a.titulo}</h3>
              {a.fato && <p className="mt-2 max-w-[82ch] text-[14px]">{a.fato}</p>}
              <div className="mt-3 flex flex-col gap-2">
                <div className="grid grid-cols-[150px_1fr] gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
                    Previsão legal
                  </span>
                  <span className="text-[13.5px]">{a.previsaoLegal || "—"}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
                    Jurisprudência
                  </span>
                  <span className="text-[13.5px]">{a.jurisprudencia || "—"}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
                    Doutrina
                  </span>
                  <span className="text-[13.5px]">{a.doutrina || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
