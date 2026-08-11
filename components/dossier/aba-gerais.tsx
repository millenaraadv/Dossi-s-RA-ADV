"use client";

import type { Dispatch, SetStateAction } from "react";
import { EditToggleButton } from "@/components/dossier/edit-toggle-button";
import type { GeraisForm } from "@/components/dossier/types";
import type { DossierFull } from "@/lib/types/dossier";
import { FIRAC_LETRAS, FIRAC_TITULOS, RISCOS, MATERIAS } from "@/lib/dossier-constants";
import { camposIniciaisPorMateria } from "@/lib/db/materia-fields";
import { capitalizarNome } from "@/lib/text";
import { normalizarDataDigitada } from "@/lib/dates";

type Membro = { id: string; nome: string; cor: string | null };

function FieldRow({
  label,
  valor,
  input,
}: {
  label: string;
  valor?: string;
  input?: React.ReactNode;
}) {
  return (
    <div className="border-b border-divisoria-fina py-3">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">{label}</div>
      {input ?? <div className="mt-1 text-[14px] text-texto">{valor || "—"}</div>}
    </div>
  );
}

const inputClass = "mt-1 w-full border border-borda-campo bg-neutro-100 px-2 py-1.5 text-[14px] text-texto outline-none";

export function AbaGerais({
  dossier,
  isEditing,
  salvando,
  form,
  setForm,
  membros,
  podeEditar,
  onStartEdit,
  onCancel,
  onConcluir,
}: {
  dossier: DossierFull;
  isEditing: boolean;
  salvando: boolean;
  form: GeraisForm;
  setForm: Dispatch<SetStateAction<GeraisForm>>;
  membros: Membro[];
  podeEditar: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onConcluir: () => void;
}) {
  const camposFirac = FIRAC_LETRAS.map((letra) => ({
    letra,
    paragrafos: isEditing ? form.firac[letra.toLowerCase() as "f" | "i" | "r" | "a" | "c"] : dossier.firac.filter((b) => b.letra === letra).map((b) => b.paragrafo),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-normal">Dados gerais</h2>
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

      <div className="grid grid-cols-2 gap-x-8">
        <FieldRow
          label="Cliente"
          valor={dossier.cliente}
          input={
            isEditing ? (
              <input
                className={inputClass}
                value={form.cliente}
                onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                onBlur={(e) => setForm((f) => ({ ...f, cliente: capitalizarNome(e.target.value) }))}
              />
            ) : undefined
          }
        />
        <FieldRow
          label="Caso"
          valor={dossier.caso}
          input={
            isEditing ? (
              <input className={inputClass} value={form.caso} onChange={(e) => setForm((f) => ({ ...f, caso: e.target.value }))} />
            ) : undefined
          }
        />
        <FieldRow
          label="Nº do processo"
          valor={dossier.numeroProcesso}
          input={
            isEditing ? (
              <input
                className={inputClass}
                value={form.numeroProcesso}
                onChange={(e) => setForm((f) => ({ ...f, numeroProcesso: e.target.value }))}
              />
            ) : undefined
          }
        />
        <FieldRow
          label="Matéria"
          valor={dossier.materia}
          input={
            isEditing ? (
              <select
                className={inputClass}
                value={form.materia}
                onChange={(e) => {
                  const novaMateria = e.target.value as (typeof MATERIAS)[number];
                  setForm((f) => {
                    const provisaoAtual =
                      f.camposEspecificos.find((c) => c.label === "Provisão / risco estimado")?.valor ?? "";
                    const novosCampos = camposIniciaisPorMateria(novaMateria).map((c) => ({
                      label: c.label,
                      valor: c.label === "Provisão / risco estimado" ? provisaoAtual : c.valor,
                    }));
                    return { ...f, materia: novaMateria, camposEspecificos: novosCampos };
                  });
                }}
              >
                {MATERIAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />
        <FieldRow
          label="Partes"
          valor={dossier.partes ?? undefined}
          input={
            isEditing ? (
              <input
                className={inputClass}
                value={form.partes}
                onChange={(e) => setForm((f) => ({ ...f, partes: e.target.value }))}
                onBlur={(e) => setForm((f) => ({ ...f, partes: capitalizarNome(e.target.value) }))}
              />
            ) : undefined
          }
        />
        <FieldRow
          label="Profissional responsável"
          valor={dossier.responsavel?.nome}
          input={
            isEditing ? (
              <select
                className={inputClass}
                value={form.responsavelId}
                onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}
              >
                <option value="">—</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />
        <FieldRow
          label="Comarca/tribunal"
          valor={dossier.orgao ?? undefined}
          input={
            isEditing ? (
              <input className={inputClass} value={form.orgao} onChange={(e) => setForm((f) => ({ ...f, orgao: e.target.value }))} />
            ) : undefined
          }
        />
        <FieldRow
          label="Magistrado"
          valor={dossier.juiz ?? undefined}
          input={
            isEditing ? (
              <input
                className={inputClass}
                value={form.juiz}
                onChange={(e) => setForm((f) => ({ ...f, juiz: e.target.value }))}
                onBlur={(e) => setForm((f) => ({ ...f, juiz: capitalizarNome(e.target.value) }))}
              />
            ) : undefined
          }
        />
        <FieldRow
          label="Fase e rito"
          valor={dossier.fase ?? undefined}
          input={
            isEditing ? (
              <input className={inputClass} value={form.fase} onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))} />
            ) : undefined
          }
        />
        <FieldRow
          label="Valor da causa"
          valor={dossier.valorCausa ?? undefined}
          input={
            isEditing ? (
              <input
                className={inputClass}
                value={form.valorCausa}
                onChange={(e) => setForm((f) => ({ ...f, valorCausa: e.target.value }))}
              />
            ) : undefined
          }
        />
        <FieldRow
          label="Advogado contrário"
          valor={dossier.advogadoContrario ?? undefined}
          input={
            isEditing ? (
              <input
                className={inputClass}
                value={form.advogadoContrario}
                onChange={(e) => setForm((f) => ({ ...f, advogadoContrario: e.target.value }))}
                onBlur={(e) => setForm((f) => ({ ...f, advogadoContrario: capitalizarNome(e.target.value) }))}
              />
            ) : undefined
          }
        />
        <FieldRow
          label="Risco/prognóstico"
          valor={dossier.risco}
          input={
            isEditing ? (
              <select className={inputClass} value={form.risco} onChange={(e) => setForm((f) => ({ ...f, risco: e.target.value }))}>
                {RISCOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />
        {(isEditing ? form.camposEspecificos : dossier.camposEspecificos).map((campo, i) => (
          <FieldRow
            key={campo.label}
            label={campo.label}
            valor={campo.valor}
            input={
              isEditing ? (
                <input
                  className={inputClass}
                  value={form.camposEspecificos[i]?.valor ?? ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = [...f.camposEspecificos];
                      next[i] = { ...next[i], valor: e.target.value };
                      return { ...f, camposEspecificos: next };
                    })
                  }
                />
              ) : undefined
            }
          />
        ))}
      </div>

      <div className="mt-8 border-l border-acento pl-4">
        <h3 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-neutro-700">Linha do tempo</h3>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            {form.timeline.map((t, i) => (
              <div key={i} className="grid grid-cols-[96px_1fr_auto] items-center gap-2">
                <input
                  className={inputClass}
                  value={t.dataTexto}
                  placeholder="dd/mm/aaaa"
                  onChange={(e) =>
                    setForm((f) => {
                      const next = [...f.timeline];
                      next[i] = { ...next[i], dataTexto: e.target.value };
                      return { ...f, timeline: next };
                    })
                  }
                  onBlur={(e) =>
                    setForm((f) => {
                      const next = [...f.timeline];
                      next[i] = { ...next[i], dataTexto: normalizarDataDigitada(e.target.value) };
                      return { ...f, timeline: next };
                    })
                  }
                />
                <input
                  className={inputClass}
                  value={t.ato}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = [...f.timeline];
                      next[i] = { ...next[i], ato: e.target.value };
                      return { ...f, timeline: next };
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, timeline: f.timeline.filter((_, j) => j !== i) }))}
                  className="border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
                >
                  Excluir
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, timeline: [...f.timeline, { dataTexto: "", ato: "" }] }))}
              className="mt-2 self-start border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-tinta-clara"
            >
              + Nova movimentação
            </button>
          </div>
        ) : dossier.timeline.length === 0 ? (
          <p className="text-[13.5px] text-neutro-700">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {dossier.timeline.map((t) => (
              <div key={t.id} className="grid grid-cols-[96px_1fr] gap-3">
                <span className="text-[12px] font-semibold text-neutro-700">{t.dataTexto}</span>
                <span className="text-[13.5px]">{t.ato}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {camposFirac.map(({ letra, paragrafos }) => (
          <div key={letra} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-acento text-[17px] text-white">
              {letra}
            </div>
            <div className="flex-1">
              <h4 className="mb-2 text-[13px] uppercase tracking-[0.1em] text-neutro-700">{FIRAC_TITULOS[letra]}</h4>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  {paragrafos.map((p, i) => (
                    <textarea
                      key={i}
                      rows={4}
                      value={p}
                      onChange={(e) =>
                        setForm((f) => {
                          const key = letra.toLowerCase() as "f" | "i" | "r" | "a" | "c";
                          const next = [...f.firac[key]];
                          next[i] = e.target.value;
                          return { ...f, firac: { ...f.firac, [key]: next } };
                        })
                      }
                      className="w-full border border-borda-campo bg-neutro-100 p-2 text-[14px] text-texto outline-none"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => {
                        const key = letra.toLowerCase() as "f" | "i" | "r" | "a" | "c";
                        return { ...f, firac: { ...f.firac, [key]: [...f.firac[key], ""] } };
                      })
                    }
                    className="self-start border border-acento px-3 py-1 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
                  >
                    + Parágrafo
                  </button>
                </div>
              ) : paragrafos.length === 0 ? (
                <p className="text-[13.5px] text-neutro-700">—</p>
              ) : (
                paragrafos.map((p, i) => (
                  <p key={i} className="max-w-[82ch] text-[14px] leading-[1.55]">
                    {p}
                  </p>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
