"use client";

import { useRef, useState } from "react";
import {
  updateProcessLink,
  deleteProcessLink,
  putProcessLinkFirac,
  putProcessLinkArguments,
  importProcessLinkPdf,
  getProcessLinkImportStatus,
} from "@/lib/client/dossier-api";
import { normalizarDataDigitada } from "@/lib/dates";
import {
  TIPOS_VINCULO_PROCESSUAL,
  VINCULO_TIPO_LABEL,
  FIRAC_LETRAS,
  FIRAC_TITULOS,
  camposVinculoNaoLocalizados,
} from "@/lib/dossier-constants";
import type { DossierFull } from "@/lib/types/dossier";
import { LoadingDots } from "@/components/ui/loading-dots";

type Vinculo = DossierFull["vinculos"][number];
type ArgumentoForm = { titulo: string; fato: string; previsaoLegal: string; jurisprudencia: string; doutrina: string };
type FiracForm = { f: string[]; i: string[]; r: string[]; a: string[]; c: string[] };

type GeraisForm = {
  tipo: (typeof TIPOS_VINCULO_PROCESSUAL)[number];
  numeroProcesso: string;
  tribunalInstancia: string;
  status: string;
  prazoContagem: string;
  prazoDataTexto: string;
  resumo: string;
  resultado: string;
  partes: string;
  juiz: string;
  fase: string;
  valorCausa: string;
  objetivo: string;
  objetivoSecundario: string;
  linhaVermelha: string;
};

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1 text-[12.5px] text-texto outline-none";

function buildGeraisForm(vinculo: Vinculo): GeraisForm {
  return {
    tipo: vinculo.tipo as (typeof TIPOS_VINCULO_PROCESSUAL)[number],
    numeroProcesso: vinculo.numeroProcesso ?? "",
    tribunalInstancia: vinculo.tribunalInstancia ?? "",
    status: vinculo.status ?? "",
    prazoContagem: vinculo.prazoContagem ?? "",
    prazoDataTexto: vinculo.prazoDataTexto ?? "",
    resumo: vinculo.resumo ?? "",
    resultado: vinculo.resultado ?? "",
    partes: vinculo.partes ?? "",
    juiz: vinculo.juiz ?? "",
    fase: vinculo.fase ?? "",
    valorCausa: vinculo.valorCausa ?? "",
    objetivo: vinculo.objetivo ?? "",
    objetivoSecundario: vinculo.objetivoSecundario ?? "",
    linhaVermelha: vinculo.linhaVermelha ?? "",
  };
}

function buildFiracForm(vinculo: Vinculo): FiracForm {
  const byLetra = (l: string) => vinculo.firac.filter((b) => b.letra === l).map((b) => b.paragrafo);
  return { f: byLetra("F"), i: byLetra("I"), r: byLetra("R"), a: byLetra("A"), c: byLetra("C") };
}

function buildArgumentosForm(vinculo: Vinculo): ArgumentoForm[] {
  return vinculo.argumentos.map((a) => ({
    titulo: a.titulo,
    fato: a.fato ?? "",
    previsaoLegal: a.previsaoLegal ?? "",
    jurisprudencia: a.jurisprudencia ?? "",
    doutrina: a.doutrina ?? "",
  }));
}

export function VinculoRow({
  vinculo,
  podeEditar,
  onChanged,
}: {
  vinculo: Vinculo;
  podeEditar: boolean;
  onChanged: () => Promise<void>;
}) {
  const [geraisForm, setGeraisForm] = useState<GeraisForm>(() => buildGeraisForm(vinculo));
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [progressoImport, setProgressoImport] = useState<string | null>(null);
  const [erroImport, setErroImport] = useState<string | null>(null);

  const [firacForm, setFiracForm] = useState<FiracForm>(() => buildFiracForm(vinculo));
  const [firacSalvando, setFiracSalvando] = useState(false);
  const [argumentosForm, setArgumentosForm] = useState<ArgumentoForm[]>(() => buildArgumentosForm(vinculo));
  const [argumentosSalvando, setArgumentosSalvando] = useState(false);

  // Ajusta o formulário quando o vínculo muda por fora desta linha (ex.: um
  // import de PDF que terminou em segundo plano) — comparação feita durante a
  // própria renderização (padrão recomendado pelo React para "resetar estado
  // derivado quando uma prop muda"), não num efeito: um efeito rodaria só
  // depois de já ter pintado a tela com dado velho, e remontar o componente
  // (via key) perderia o "expandido" e outros estados só desta linha.
  const [atualizadoEmSincronizado, setAtualizadoEmSincronizado] = useState(vinculo.atualizadoEm);
  if (vinculo.atualizadoEm !== atualizadoEmSincronizado) {
    setAtualizadoEmSincronizado(vinculo.atualizadoEm);
    setGeraisForm(buildGeraisForm(vinculo));
    setFiracForm(buildFiracForm(vinculo));
    setArgumentosForm(buildArgumentosForm(vinculo));
  }

  const naoLocalizados = camposVinculoNaoLocalizados(vinculo);

  function campo<K extends keyof GeraisForm>(chave: K, valor: GeraisForm[K]) {
    setGeraisForm((f) => ({ ...f, [chave]: valor }));
  }

  async function salvarAlteracoes() {
    setSalvando(true);
    try {
      await updateProcessLink(vinculo.id, {
        tipo: geraisForm.tipo,
        numeroProcesso: geraisForm.numeroProcesso || null,
        tribunalInstancia: geraisForm.tribunalInstancia || null,
        status: geraisForm.status || null,
        prazoContagem: geraisForm.prazoContagem || null,
        prazoDataTexto: normalizarDataDigitada(geraisForm.prazoDataTexto) || null,
        resumo: geraisForm.resumo || null,
        resultado: geraisForm.resultado || null,
        partes: geraisForm.partes || null,
        juiz: geraisForm.juiz || null,
        fase: geraisForm.fase || null,
        valorCausa: geraisForm.valorCausa || null,
        objetivo: geraisForm.objetivo || null,
        objetivoSecundario: geraisForm.objetivoSecundario || null,
        linhaVermelha: geraisForm.linhaVermelha || null,
      });
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setExcluindo(true);
    try {
      await deleteProcessLink(vinculo.id);
      await onChanged();
    } finally {
      setExcluindo(false);
    }
  }

  function expandir() {
    setExpandido((v) => !v);
  }

  async function acompanharImportacao(importId: string) {
    for (;;) {
      await new Promise((r) => setTimeout(r, 1500));
      let data;
      try {
        data = await getProcessLinkImportStatus(importId);
      } catch {
        setErroImport("Não foi possível verificar o andamento da importação.");
        setImportando(false);
        return;
      }
      if (data.status === "erro") {
        setErroImport(data.erro ?? "Não foi possível processar o PDF.");
        setImportando(false);
        return;
      }
      if (data.status === "concluido") {
        setImportando(false);
        setProgressoImport(null);
        await onChanged();
        return;
      }
      setProgressoImport(data.status === "processando" ? "Extraindo as informações do PDF…" : "Lendo o arquivo…");
    }
  }

  async function importarPdf() {
    const arquivo = fileInputRef.current?.files?.[0];
    if (!arquivo) return;
    setErroImport(null);
    setImportando(true);
    setProgressoImport(`Enviando ${arquivo.name}…`);
    try {
      const { id } = await importProcessLinkPdf(vinculo.id, arquivo);
      setProgressoImport("Lendo o arquivo…");
      await acompanharImportacao(id);
    } catch (e) {
      setErroImport(e instanceof Error ? e.message : "Falha ao enviar o arquivo.");
      setImportando(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function salvarFirac() {
    setFiracSalvando(true);
    try {
      await putProcessLinkFirac(vinculo.id, firacForm);
      await onChanged();
    } finally {
      setFiracSalvando(false);
    }
  }

  async function salvarArgumentos() {
    setArgumentosSalvando(true);
    try {
      await putProcessLinkArguments(
        vinculo.id,
        argumentosForm.filter((a) => a.titulo.trim()),
      );
      await onChanged();
    } finally {
      setArgumentosSalvando(false);
    }
  }

  const rotulo = VINCULO_TIPO_LABEL[vinculo.tipo as keyof typeof VINCULO_TIPO_LABEL] ?? vinculo.tipo;

  if (!podeEditar) {
    return (
      <div className="border-b border-divisoria-fina py-4">
        <div className="text-[13.5px]">
          <span className="font-semibold">{rotulo}</span>
          {vinculo.numeroProcesso && <span className="text-neutro-700"> · nº {vinculo.numeroProcesso}</span>}
          {vinculo.tribunalInstancia && <span className="text-neutro-700"> · {vinculo.tribunalInstancia}</span>}
        </div>
        {vinculo.status && <div className="mt-1 text-[13px] text-neutro-700">Status: {vinculo.status}</div>}
        {vinculo.resumo && <p className="mt-1 max-w-[70ch] text-[13px]">{vinculo.resumo}</p>}
        {(vinculo.prazoContagem || vinculo.prazoDataTexto) && (
          <div className="mt-1 text-[13px] text-neutro-700">
            Prazo: {vinculo.prazoContagem} {vinculo.prazoDataTexto}
          </div>
        )}
        {vinculo.resultado && <div className="mt-1 text-[13px] text-neutro-700">Resultado: {vinculo.resultado}</div>}
        {(vinculo.partes || vinculo.juiz || vinculo.fase || vinculo.valorCausa) && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-neutro-700">
            {vinculo.partes && <div>Partes: {vinculo.partes}</div>}
            {vinculo.juiz && <div>Magistrado: {vinculo.juiz}</div>}
            {vinculo.fase && <div>Fase: {vinculo.fase}</div>}
            {vinculo.valorCausa && <div>Valor da causa: {vinculo.valorCausa}</div>}
          </div>
        )}
        {(vinculo.objetivo || vinculo.objetivoSecundario || vinculo.linhaVermelha) && (
          <div className="mt-2 flex flex-col gap-1 text-[13px]">
            {vinculo.objetivo && (
              <div>
                <span className="font-semibold text-neutro-700">Objetivo:</span> {vinculo.objetivo}
              </div>
            )}
            {vinculo.objetivoSecundario && (
              <div>
                <span className="font-semibold text-neutro-700">Objetivo secundário:</span> {vinculo.objetivoSecundario}
              </div>
            )}
            {vinculo.linhaVermelha && (
              <div>
                <span className="font-semibold text-neutro-700">Linha vermelha:</span> {vinculo.linhaVermelha}
              </div>
            )}
          </div>
        )}
        {vinculo.argumentos.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {vinculo.argumentos.map((a) => (
              <div key={a.id} className="text-[13px]">
                <span className="text-acento">{a.tag}</span> {a.titulo}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-divisoria-fina py-3">
      <div className="grid grid-cols-[180px_1fr_1fr_auto] items-start gap-2">
        <select className={inputClass} value={geraisForm.tipo} onChange={(e) => campo("tipo", e.target.value as GeraisForm["tipo"])}>
          {TIPOS_VINCULO_PROCESSUAL.map((t) => (
            <option key={t} value={t}>
              {VINCULO_TIPO_LABEL[t]}
            </option>
          ))}
        </select>
        <input
          className={inputClass}
          placeholder="Nº do processo"
          value={geraisForm.numeroProcesso}
          onChange={(e) => campo("numeroProcesso", e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Tribunal/instância"
          value={geraisForm.tribunalInstancia}
          onChange={(e) => campo("tribunalInstancia", e.target.value)}
        />
        <button
          type="button"
          onClick={excluir}
          disabled={excluindo}
          className="inline-flex items-center gap-2 border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara disabled:opacity-60"
        >
          Excluir {excluindo && <LoadingDots />}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          className={inputClass}
          placeholder="Status (ex.: Em trâmite)"
          value={geraisForm.status}
          onChange={(e) => campo("status", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass}
            placeholder="Contagem do prazo"
            value={geraisForm.prazoContagem}
            onChange={(e) => campo("prazoContagem", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Data (ex.: 19/08/2026)"
            value={geraisForm.prazoDataTexto}
            onChange={(e) => campo("prazoDataTexto", e.target.value)}
            onBlur={(e) => campo("prazoDataTexto", normalizarDataDigitada(e.target.value))}
          />
        </div>
      </div>

      <textarea
        rows={2}
        className={`mt-2 ${inputClass}`}
        placeholder="Resumo/objeto"
        value={geraisForm.resumo}
        onChange={(e) => campo("resumo", e.target.value)}
      />
      <textarea
        rows={2}
        className={`mt-2 ${inputClass}`}
        placeholder="Resultado/decisão (quando houver)"
        value={geraisForm.resultado}
        onChange={(e) => campo("resultado", e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="inline-flex items-center gap-2 bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
        >
          Salvar alterações {salvando && <LoadingDots />}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={importarPdf} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importando}
          className="inline-flex items-center gap-2 border border-ambar bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-ambar hover:bg-tinta-clara disabled:opacity-60"
        >
          Anexar PDF do processo {importando && <LoadingDots />}
        </button>
        <button
          type="button"
          onClick={expandir}
          className="border border-acento px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
        >
          {expandido ? "Ocultar detalhes completos" : "Ver/editar detalhes completos"}
        </button>
      </div>

      {progressoImport && (
        <div className="mt-2 flex items-center gap-2 border-l-[3px] border-ambar bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          {progressoImport} <LoadingDots />
        </div>
      )}
      {erroImport && (
        <div className="mt-2 border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          {erroImport}
        </div>
      )}
      {naoLocalizados.length > 0 && (
        <div className="mt-2 border-l-[3px] border-ambar bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          A IA não localizou no PDF: {naoLocalizados.join(", ")}. Confira antes de usar.
        </div>
      )}

      {expandido && (
        <div className="mt-3 border-l-[3px] border-divisoria-fina bg-neutro-100 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            Dados gerais deste processo
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              placeholder="Partes"
              value={geraisForm.partes}
              onChange={(e) => campo("partes", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Magistrado"
              value={geraisForm.juiz}
              onChange={(e) => campo("juiz", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Fase e rito"
              value={geraisForm.fase}
              onChange={(e) => campo("fase", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Valor da causa"
              value={geraisForm.valorCausa}
              onChange={(e) => campo("valorCausa", e.target.value)}
            />
          </div>

          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            Estratégia deste processo
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              rows={2}
              className={inputClass}
              placeholder="Objetivo"
              value={geraisForm.objetivo}
              onChange={(e) => campo("objetivo", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <textarea
                rows={2}
                className={inputClass}
                placeholder="Objetivo secundário"
                value={geraisForm.objetivoSecundario}
                onChange={(e) => campo("objetivoSecundario", e.target.value)}
              />
              <textarea
                rows={2}
                className={inputClass}
                placeholder="Linha vermelha"
                value={geraisForm.linhaVermelha}
                onChange={(e) => campo("linhaVermelha", e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={salvarAlteracoes}
            disabled={salvando}
            className="mt-3 inline-flex items-center gap-2 bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
          >
            Salvar alterações {salvando && <LoadingDots />}
          </button>

          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            FIRAC deste processo
          </div>
          <div className="mt-2 flex flex-col gap-3">
            {FIRAC_LETRAS.map((letra) => {
              const key = letra.toLowerCase() as "f" | "i" | "r" | "a" | "c";
              return (
                <div key={letra} className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-acento text-[13px] text-white">
                    {letra}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-neutro-700">{FIRAC_TITULOS[letra]}</div>
                    <div className="mt-1 flex flex-col gap-1">
                      {firacForm[key].map((p, i) => (
                        <textarea
                          key={i}
                          rows={2}
                          value={p}
                          onChange={(e) =>
                            setFiracForm((f) => {
                              const next = [...f[key]];
                              next[i] = e.target.value;
                              return { ...f, [key]: next };
                            })
                          }
                          className={inputClass}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setFiracForm((f) => ({ ...f, [key]: [...f[key], ""] }))}
                        className="self-start border border-acento px-2 py-0.5 text-[10px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
                      >
                        + Parágrafo
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={salvarFirac}
              disabled={firacSalvando}
              className="inline-flex items-center gap-2 self-start bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
            >
              Salvar FIRAC {firacSalvando && <LoadingDots />}
            </button>
          </div>

          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
            Argumentos deste processo
          </div>
          <div className="mt-2 flex flex-col gap-3">
            {argumentosForm.map((a, i) => (
              <div key={i} className="border-t border-divisoria-fina pt-2 first:border-t-0 first:pt-0">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-acento">A{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setArgumentosForm((atual) => atual.filter((_, j) => j !== i))}
                    className="border border-acento px-2 py-0.5 text-[10px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
                  >
                    Excluir
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    className={inputClass}
                    placeholder="Título"
                    value={a.titulo}
                    onChange={(e) =>
                      setArgumentosForm((atual) => atual.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))
                    }
                  />
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Fato"
                    value={a.fato}
                    onChange={(e) =>
                      setArgumentosForm((atual) => atual.map((x, j) => (j === i ? { ...x, fato: e.target.value } : x)))
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Previsão legal"
                    value={a.previsaoLegal}
                    onChange={(e) =>
                      setArgumentosForm((atual) =>
                        atual.map((x, j) => (j === i ? { ...x, previsaoLegal: e.target.value } : x)),
                      )
                    }
                  />
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Jurisprudência"
                    value={a.jurisprudencia}
                    onChange={(e) =>
                      setArgumentosForm((atual) =>
                        atual.map((x, j) => (j === i ? { ...x, jurisprudencia: e.target.value } : x)),
                      )
                    }
                  />
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Doutrina"
                    value={a.doutrina}
                    onChange={(e) =>
                      setArgumentosForm((atual) => atual.map((x, j) => (j === i ? { ...x, doutrina: e.target.value } : x)))
                    }
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setArgumentosForm((atual) => [
                    ...atual,
                    { titulo: "", fato: "", previsaoLegal: "", jurisprudencia: "", doutrina: "" },
                  ])
                }
                className="border border-acento px-3 py-1 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara"
              >
                + Novo argumento
              </button>
              <button
                type="button"
                onClick={salvarArgumentos}
                disabled={argumentosSalvando}
                className="inline-flex items-center gap-2 bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
              >
                Salvar argumentos {argumentosSalvando && <LoadingDots />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
