"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { EditToggleButton } from "@/components/dossier/edit-toggle-button";
import type { ArgumentoForm } from "@/components/dossier/types";
import type { DossierFull } from "@/lib/types/dossier";
import { suggestArgumentos, type SugestaoArgumento } from "@/lib/client/dossier-api";
import { LoadingDots } from "@/components/ui/loading-dots";

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
  const [sugestoes, setSugestoes] = useState<SugestaoArgumento[] | null>(null);
  const [carregandoSugestao, setCarregandoSugestao] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  function atualizar(i: number, campo: keyof ArgumentoForm, valor: string) {
    setForm((atual) => {
      const next = [...atual];
      next[i] = { ...next[i], [campo]: valor };
      return next;
    });
  }

  async function pedirSugestao() {
    setCarregandoSugestao(true);
    setErroSugestao(null);
    try {
      setSugestoes((await suggestArgumentos(dossier.id)).argumentos);
    } catch (e) {
      setErroSugestao(e instanceof Error ? e.message : "Não foi possível obter sugestões da IA.");
    } finally {
      setCarregandoSugestao(false);
    }
  }

  function adicionarSugestao(indice: number) {
    const sugestao = sugestoes?.[indice];
    if (!sugestao) return;
    if (!isEditing) onStartEdit();
    setForm((atual) => [...atual, { ...sugestao }]);
    setSugestoes((atual) => (atual ? atual.filter((_, i) => i !== indice) : atual));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-normal">Argumentos e embasamento</h2>
        <div className="flex items-center gap-2">
          {podeEditar && (
            <button
              type="button"
              onClick={pedirSugestao}
              disabled={carregandoSugestao}
              className="inline-flex items-center gap-2 border border-ambar bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ambar hover:bg-tinta-clara disabled:opacity-60"
            >
              {carregandoSugestao ? (
                <>
                  Lendo o dossiê e redigindo sugestões <LoadingDots />
                </>
              ) : (
                "Sugestões da IA"
              )}
            </button>
          )}
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

      {erroSugestao && (
        <div className="mt-4 border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          {erroSugestao}
        </div>
      )}

      {sugestoes && sugestoes.length > 0 && (
        <div className="mt-4 flex flex-col gap-4 border-l-[3px] border-ambar bg-tinta-clara p-4">
          {sugestoes.map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-4 border-t border-acento pt-3 first:border-t-0 first:pt-0">
              <div className="max-w-[70ch]">
                <h3 className="text-[14.5px] font-normal">{s.titulo}</h3>
                {s.fato && <p className="mt-1 text-[13px] text-texto">{s.fato}</p>}
                <div className="mt-2 flex flex-col gap-1 text-[12.5px]">
                  <span>
                    <strong className="font-semibold">Previsão legal:</strong> {s.previsaoLegal || "—"}
                  </span>
                  <span>
                    <strong className="font-semibold">Jurisprudência:</strong> {s.jurisprudencia || "—"}
                  </span>
                  <span>
                    <strong className="font-semibold">Doutrina:</strong> {s.doutrina || "—"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => adicionarSugestao(i)}
                className="inline-flex shrink-0 items-center gap-2 border border-acento bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-neutro-200"
              >
                + Adicionar
              </button>
            </div>
          ))}
        </div>
      )}

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
