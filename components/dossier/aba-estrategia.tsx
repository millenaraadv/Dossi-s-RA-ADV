"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { EditToggleButton } from "@/components/dossier/edit-toggle-button";
import { PassoRow } from "@/components/dossier/passo-row";
import { PrazoRow } from "@/components/dossier/prazo-row";
import type { EstrategiaForm } from "@/components/dossier/types";
import type { DossierFull } from "@/lib/types/dossier";
import {
  createStep,
  createDeadline,
  patchDossier,
  suggestEstrategia,
  type SugestaoEstrategia,
} from "@/lib/client/dossier-api";
import { normalizarDataDigitada } from "@/lib/dates";
import { LoadingDots } from "@/components/ui/loading-dots";

type Membro = { id: string; nome: string; cor: string | null };

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1.5 text-[13px] text-texto outline-none";

export function AbaEstrategia({
  dossier,
  isEditing,
  salvando,
  form,
  setForm,
  podeEditar,
  podeRegistrarTentativa,
  podeMarcarPrazo,
  membros,
  onStartEdit,
  onCancel,
  onConcluir,
  onPassosChanged,
  onPrazosChanged,
  onDossierChanged,
}: {
  dossier: DossierFull;
  isEditing: boolean;
  salvando: boolean;
  form: EstrategiaForm;
  setForm: Dispatch<SetStateAction<EstrategiaForm>>;
  podeEditar: boolean;
  podeRegistrarTentativa: boolean;
  podeMarcarPrazo: boolean;
  membros: Membro[];
  onStartEdit: () => void;
  onCancel: () => void;
  onConcluir: () => void;
  onPassosChanged: () => Promise<void>;
  onPrazosChanged: () => Promise<void>;
  onDossierChanged: () => Promise<void>;
}) {
  const [novaAberta, setNovaAberta] = useState(false);
  const [novaAcao, setNovaAcao] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState(membros[0]?.id ?? "");
  const [novaData, setNovaData] = useState("");
  const [criando, setCriando] = useState(false);

  const [novoPrazoAberto, setNovoPrazoAberto] = useState(false);
  const [novoPrazoAto, setNovoPrazoAto] = useState("");
  const [novoPrazoContagem, setNovoPrazoContagem] = useState("");
  const [novoPrazoData, setNovoPrazoData] = useState("");
  const [criandoPrazo, setCriandoPrazo] = useState(false);

  const [sugestao, setSugestao] = useState<SugestaoEstrategia | null>(null);
  const [carregandoSugestao, setCarregandoSugestao] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);
  const [aplicandoObjetivo, setAplicandoObjetivo] = useState(false);
  const [aplicandoObjetivoSecundario, setAplicandoObjetivoSecundario] = useState(false);
  const [aplicandoLinhaVermelha, setAplicandoLinhaVermelha] = useState(false);
  const [aplicandoPasso, setAplicandoPasso] = useState<number | null>(null);
  const [aplicandoPrazo, setAplicandoPrazo] = useState<number | null>(null);

  async function pedirSugestao() {
    setCarregandoSugestao(true);
    setErroSugestao(null);
    try {
      setSugestao(await suggestEstrategia(dossier.id));
    } catch (e) {
      setErroSugestao(e instanceof Error ? e.message : "Não foi possível obter sugestões da IA.");
    } finally {
      setCarregandoSugestao(false);
    }
  }

  async function substituirObjetivoSugerido() {
    if (!sugestao) return;
    setAplicandoObjetivo(true);
    try {
      await patchDossier(dossier.id, { objetivo: sugestao.objetivo }, { viaIa: true });
      await onDossierChanged();
    } finally {
      setAplicandoObjetivo(false);
    }
  }

  async function substituirObjetivoSecundarioSugerido() {
    if (!sugestao) return;
    setAplicandoObjetivoSecundario(true);
    try {
      await patchDossier(dossier.id, { objetivoSecundario: sugestao.objetivoSecundario }, { viaIa: true });
      await onDossierChanged();
    } finally {
      setAplicandoObjetivoSecundario(false);
    }
  }

  async function substituirLinhaVermelhaSugerida() {
    if (!sugestao) return;
    setAplicandoLinhaVermelha(true);
    try {
      await patchDossier(dossier.id, { linhaVermelha: sugestao.linhaVermelha }, { viaIa: true });
      await onDossierChanged();
    } finally {
      setAplicandoLinhaVermelha(false);
    }
  }

  async function adicionarPassoSugerido(indice: number) {
    if (!sugestao) return;
    const passo = sugestao.passos[indice];
    setAplicandoPasso(indice);
    try {
      await createStep(
        dossier.id,
        { acao: passo.acao, responsavelId: null, proximaData: passo.proximaData || null },
        { viaIa: true },
      );
      await onDossierChanged();
      setSugestao((atual) => (atual ? { ...atual, passos: atual.passos.filter((_, i) => i !== indice) } : atual));
    } finally {
      setAplicandoPasso(null);
    }
  }

  async function adicionarPrazoSugerido(indice: number) {
    if (!sugestao) return;
    const prazo = sugestao.prazos[indice];
    setAplicandoPrazo(indice);
    try {
      await createDeadline(
        dossier.id,
        {
          ato: prazo.ato,
          contagem: prazo.contagem || null,
          dataTexto: prazo.dataTexto || null,
        },
        { viaIa: true },
      );
      await onPrazosChanged();
      setSugestao((atual) => (atual ? { ...atual, prazos: atual.prazos.filter((_, i) => i !== indice) } : atual));
    } finally {
      setAplicandoPrazo(null);
    }
  }

  async function adicionarPasso() {
    if (!novaAcao.trim()) return;
    setCriando(true);
    try {
      await createStep(dossier.id, {
        acao: novaAcao,
        responsavelId: novoResponsavel || null,
        proximaData: novaData || null,
      });
      setNovaAberta(false);
      setNovaAcao("");
      setNovaData("");
      await onPassosChanged();
    } finally {
      setCriando(false);
    }
  }

  async function adicionarPrazo() {
    if (!novoPrazoAto.trim()) return;
    setCriandoPrazo(true);
    try {
      await createDeadline(dossier.id, {
        ato: novoPrazoAto,
        contagem: novoPrazoContagem || null,
        dataTexto: novoPrazoData || null,
      });
      setNovoPrazoAberto(false);
      setNovoPrazoAto("");
      setNovoPrazoContagem("");
      setNovoPrazoData("");
      await onPrazosChanged();
    } finally {
      setCriandoPrazo(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-normal">Estratégia</h2>
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

      {erroSugestao && (
        <div className="mb-4 border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          {erroSugestao}
        </div>
      )}

      {sugestao && (
        <div className="mb-6 border-l-[3px] border-ambar bg-tinta-clara p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-profundo">
                Sugestão de objetivo <span className="normal-case tracking-normal text-neutro-700">(editável)</span>
              </div>
              <textarea
                rows={2}
                value={sugestao.objetivo}
                onChange={(e) =>
                  setSugestao((atual) => (atual ? { ...atual, objetivo: e.target.value } : atual))
                }
                className="mt-1 w-full max-w-[60ch] border border-borda-campo bg-neutro-100 p-2 text-[14px] text-texto outline-none"
              />
            </div>
            <button
              type="button"
              onClick={substituirObjetivoSugerido}
              disabled={aplicandoObjetivo}
              className="inline-flex shrink-0 items-center gap-2 border border-acento bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-neutro-200 disabled:opacity-60"
            >
              Substituir objetivo {aplicandoObjetivo && <LoadingDots />}
            </button>
          </div>

          {(sugestao.objetivoSecundario || sugestao.linhaVermelha) && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-acento pt-3">
              {sugestao.objetivoSecundario && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-profundo">
                    Objetivo secundário <span className="normal-case tracking-normal text-neutro-700">(editável)</span>
                  </div>
                  <textarea
                    rows={2}
                    value={sugestao.objetivoSecundario}
                    onChange={(e) =>
                      setSugestao((atual) => (atual ? { ...atual, objetivoSecundario: e.target.value } : atual))
                    }
                    className="mt-1 w-full border border-borda-campo bg-neutro-100 p-2 text-[13.5px] text-texto outline-none"
                  />
                  <button
                    type="button"
                    onClick={substituirObjetivoSecundarioSugerido}
                    disabled={aplicandoObjetivoSecundario}
                    className="mt-1.5 inline-flex items-center gap-2 border border-acento bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-neutro-200 disabled:opacity-60"
                  >
                    Substituir {aplicandoObjetivoSecundario && <LoadingDots />}
                  </button>
                </div>
              )}
              {sugestao.linhaVermelha && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-profundo">
                    Linha vermelha <span className="normal-case tracking-normal text-neutro-700">(editável)</span>
                  </div>
                  <textarea
                    rows={2}
                    value={sugestao.linhaVermelha}
                    onChange={(e) =>
                      setSugestao((atual) => (atual ? { ...atual, linhaVermelha: e.target.value } : atual))
                    }
                    className="mt-1 w-full border border-borda-campo bg-neutro-100 p-2 text-[13.5px] text-texto outline-none"
                  />
                  <button
                    type="button"
                    onClick={substituirLinhaVermelhaSugerida}
                    disabled={aplicandoLinhaVermelha}
                    className="mt-1.5 inline-flex items-center gap-2 border border-acento bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-neutro-200 disabled:opacity-60"
                  >
                    Substituir {aplicandoLinhaVermelha && <LoadingDots />}
                  </button>
                </div>
              )}
            </div>
          )}

          {sugestao.passos.length > 0 && (
            <div className="mt-4 border-t border-acento pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-profundo">
                Passos sugeridos <span className="normal-case tracking-normal text-neutro-700">(editáveis)</span>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {sugestao.passos.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <textarea
                      value={p.acao}
                      onChange={(e) =>
                        setSugestao((atual) =>
                          atual
                            ? {
                                ...atual,
                                passos: atual.passos.map((passo, j) =>
                                  j === i ? { ...passo, acao: e.target.value } : passo,
                                ),
                              }
                            : atual,
                        )
                      }
                      rows={1}
                      wrap="off"
                      className="flex-1 resize-none overflow-x-auto whitespace-pre border border-borda-campo bg-neutro-100 px-2 py-1 text-[13.5px] text-texto outline-none"
                    />
                    <input
                      type="date"
                      value={p.proximaData}
                      onChange={(e) =>
                        setSugestao((atual) =>
                          atual
                            ? {
                                ...atual,
                                passos: atual.passos.map((passo, j) =>
                                  j === i ? { ...passo, proximaData: e.target.value } : passo,
                                ),
                              }
                            : atual,
                        )
                      }
                      className="w-[140px] shrink-0 border border-borda-campo bg-neutro-100 px-2 py-1 text-[13px] text-texto outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => adicionarPassoSugerido(i)}
                      disabled={aplicandoPasso === i}
                      className="inline-flex shrink-0 items-center gap-2 border border-acento bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-neutro-200 disabled:opacity-60"
                    >
                      + Adicionar {aplicandoPasso === i && <LoadingDots />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sugestao.prazos.length > 0 && (
            <div className="mt-4 border-t border-acento pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-profundo">
                Prazos sugeridos <span className="normal-case tracking-normal text-neutro-700">(editáveis)</span>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {sugestao.prazos.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={p.ato}
                      onChange={(e) =>
                        setSugestao((atual) =>
                          atual
                            ? {
                                ...atual,
                                prazos: atual.prazos.map((prazo, j) =>
                                  j === i ? { ...prazo, ato: e.target.value } : prazo,
                                ),
                              }
                            : atual,
                        )
                      }
                      placeholder="Ato"
                      className="flex-1 border border-borda-campo bg-neutro-100 px-2 py-1 text-[13.5px] text-texto outline-none"
                    />
                    <input
                      value={p.contagem}
                      onChange={(e) =>
                        setSugestao((atual) =>
                          atual
                            ? {
                                ...atual,
                                prazos: atual.prazos.map((prazo, j) =>
                                  j === i ? { ...prazo, contagem: e.target.value } : prazo,
                                ),
                              }
                            : atual,
                        )
                      }
                      placeholder="Contagem"
                      className="w-[140px] shrink-0 border border-borda-campo bg-neutro-100 px-2 py-1 text-[13px] text-texto outline-none"
                    />
                    <input
                      value={p.dataTexto}
                      onChange={(e) =>
                        setSugestao((atual) =>
                          atual
                            ? {
                                ...atual,
                                prazos: atual.prazos.map((prazo, j) =>
                                  j === i ? { ...prazo, dataTexto: e.target.value } : prazo,
                                ),
                              }
                            : atual,
                        )
                      }
                      onBlur={(e) =>
                        setSugestao((atual) =>
                          atual
                            ? {
                                ...atual,
                                prazos: atual.prazos.map((prazo, j) =>
                                  j === i ? { ...prazo, dataTexto: normalizarDataDigitada(e.target.value) } : prazo,
                                ),
                              }
                            : atual,
                        )
                      }
                      placeholder="Data (ex.: 19/08/2026)"
                      className="w-[140px] shrink-0 border border-borda-campo bg-neutro-100 px-2 py-1 text-[13px] text-texto outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => adicionarPrazoSugerido(i)}
                      disabled={aplicandoPrazo === i}
                      className="inline-flex shrink-0 items-center gap-2 border border-acento bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-neutro-200 disabled:opacity-60"
                    >
                      + Adicionar {aplicandoPrazo === i && <LoadingDots />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sugestao.riscos.length > 0 && (
            <div className="mt-4 border-t border-acento pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-profundo">
                Riscos apontados
              </div>
              <ul className="mt-2 list-disc pl-4 text-[13.5px] text-texto">
                {sugestao.riscos.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isEditing ? (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Objetivo</span>
          <textarea
            rows={3}
            value={form.objetivo}
            onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
            className="w-full border border-borda-campo bg-neutro-100 p-3 text-[16px] text-texto outline-none"
          />
        </label>
      ) : (
        <div className="max-w-[48ch] bg-acento p-6 text-white">
          <div className="text-[10px] uppercase tracking-[0.1em]">Objetivo</div>
          <p className="mt-1 text-[20px] font-normal leading-[1.3]">{dossier.objetivo || "—"}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 divide-x divide-divisoria-fina">
        <div className="pr-6">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            Objetivo secundário
          </div>
          {isEditing ? (
            <textarea
              rows={2}
              value={form.objetivoSecundario}
              onChange={(e) => setForm((f) => ({ ...f, objetivoSecundario: e.target.value }))}
              className="mt-1 w-full border border-borda-campo bg-neutro-100 p-2 text-[14px] outline-none"
            />
          ) : (
            <p className="mt-1 text-[14px]">{dossier.objetivoSecundario || "—"}</p>
          )}
        </div>
        <div className="pl-6">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Linha vermelha</div>
          {isEditing ? (
            <textarea
              rows={2}
              value={form.linhaVermelha}
              onChange={(e) => setForm((f) => ({ ...f, linhaVermelha: e.target.value }))}
              className="mt-1 w-full border border-borda-campo bg-neutro-100 p-2 text-[14px] outline-none"
            />
          ) : (
            <p className="mt-1 text-[14px]">{dossier.linhaVermelha || "—"}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-neutro-700">Próximos passos</h3>
        {dossier.passos.length === 0 ? (
          <p className="text-[13.5px] text-neutro-700">Nenhum passo registrado.</p>
        ) : (
          <div className="flex flex-col">
            {dossier.passos.map((p) => (
              <PassoRow
                key={p.id}
                passo={p}
                isEditing={isEditing}
                podeRegistrarTentativa={podeRegistrarTentativa}
                membros={membros}
                onChanged={onPassosChanged}
              />
            ))}
          </div>
        )}

        {podeEditar && (
          <div className="mt-3">
            {novaAberta ? (
              <div className="flex flex-col gap-2 border-l-[3px] border-acento bg-neutro-100 p-3">
                <input
                  placeholder="Ação"
                  value={novaAcao}
                  onChange={(e) => setNovaAcao(e.target.value)}
                  className={inputClass}
                />
                <select value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {membros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className={inputClass} />
                <button
                  type="button"
                  onClick={adicionarPasso}
                  disabled={criando}
                  className="inline-flex items-center gap-2 self-start bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
                >
                  Adicionar {criando && <LoadingDots />}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNovaAberta(true)}
                className="border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-tinta-clara"
              >
                + Nova demanda
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-neutro-700">Prazos em aberto</h3>
        {dossier.prazos.length === 0 ? (
          <p className="text-[13.5px] text-neutro-700">Nenhum prazo em aberto.</p>
        ) : (
          <div className="flex flex-col">
            {dossier.prazos.map((p) => (
              <PrazoRow
                key={p.id}
                prazo={p}
                isEditing={isEditing}
                podeMarcar={podeMarcarPrazo}
                membros={membros}
                onChanged={onPrazosChanged}
              />
            ))}
          </div>
        )}

        {podeEditar && (
          <div className="mt-3">
            {novoPrazoAberto ? (
              <div className="flex flex-col gap-2 border-l-[3px] border-acento bg-neutro-100 p-3">
                <input
                  placeholder="Ato"
                  value={novoPrazoAto}
                  onChange={(e) => setNovoPrazoAto(e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Contagem (ex.: 15 dias úteis)"
                  value={novoPrazoContagem}
                  onChange={(e) => setNovoPrazoContagem(e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Data (ex.: 19/08/2026)"
                  value={novoPrazoData}
                  onChange={(e) => setNovoPrazoData(e.target.value)}
                  onBlur={(e) => setNovoPrazoData(normalizarDataDigitada(e.target.value))}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={adicionarPrazo}
                  disabled={criandoPrazo}
                  className="inline-flex items-center gap-2 self-start bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
                >
                  Adicionar {criandoPrazo && <LoadingDots />}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNovoPrazoAberto(true)}
                className="border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-tinta-clara"
              >
                + Novo prazo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
