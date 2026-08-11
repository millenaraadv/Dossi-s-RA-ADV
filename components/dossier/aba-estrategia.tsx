"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { EditToggleButton } from "@/components/dossier/edit-toggle-button";
import { PassoRow } from "@/components/dossier/passo-row";
import { PrazoRow } from "@/components/dossier/prazo-row";
import type { EstrategiaForm } from "@/components/dossier/types";
import type { DossierFull } from "@/lib/types/dossier";
import { createStep, createDeadline } from "@/lib/client/dossier-api";
import { normalizarDataDigitada } from "@/lib/dates";

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
                  className="self-start bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
                >
                  Adicionar
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
                  className="self-start bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
                >
                  Adicionar
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
