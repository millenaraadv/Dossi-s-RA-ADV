"use client";

import { useRef, useState } from "react";
import {
  updateProcessLink,
  deleteProcessLink,
  putProcessLinkFirac,
  putProcessLinkArguments,
  importProcessLinkPdf,
  getProcessLinkImportStatus,
  removeProcessLinkAttachment,
} from "@/lib/client/dossier-api";
import { normalizarDataDigitada } from "@/lib/dates";
import {
  TIPOS_VINCULO_PROCESSUAL,
  VINCULO_TIPO_LABEL,
  FIRAC_LETRAS,
  FIRAC_TITULOS,
  ETAPAS,
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
};

type EstrategiaForm = {
  objetivo: string;
  objetivoSecundario: string;
  linhaVermelha: string;
};

const inputClass = "w-full border border-borda-campo bg-neutro-100 px-2 py-1 text-[12.5px] text-texto outline-none";
const rotuloClass = "text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700";

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
  };
}

function buildEstrategiaForm(vinculo: Vinculo): EstrategiaForm {
  return {
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

function ConsolidatedView({ vinculo }: { vinculo: Vinculo }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div>
        <div className={rotuloClass}>Dados gerais</div>
        <div className="mt-2 text-[13.5px]">
          {vinculo.status && <div className="text-neutro-700">Status: {vinculo.status}</div>}
          {vinculo.resumo && <p className="mt-1 max-w-[70ch]">{vinculo.resumo}</p>}
          {(vinculo.prazoContagem || vinculo.prazoDataTexto) && (
            <div className="mt-1 text-neutro-700">
              Prazo: {vinculo.prazoContagem} {vinculo.prazoDataTexto}
            </div>
          )}
          {vinculo.resultado && <div className="mt-1 text-neutro-700">Resultado: {vinculo.resultado}</div>}
          {(vinculo.partes || vinculo.juiz || vinculo.fase || vinculo.valorCausa) && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-neutro-700">
              {vinculo.partes && <div>Partes: {vinculo.partes}</div>}
              {vinculo.juiz && <div>Magistrado: {vinculo.juiz}</div>}
              {vinculo.fase && <div>Fase: {vinculo.fase}</div>}
              {vinculo.valorCausa && <div>Valor da causa: {vinculo.valorCausa}</div>}
            </div>
          )}
          {vinculo.arquivoAnexoNome && <div className="mt-2 text-neutro-700">Anexo: {vinculo.arquivoAnexoNome}</div>}
          {!vinculo.status &&
            !vinculo.resumo &&
            !vinculo.prazoContagem &&
            !vinculo.prazoDataTexto &&
            !vinculo.resultado &&
            !vinculo.partes &&
            !vinculo.juiz &&
            !vinculo.fase &&
            !vinculo.valorCausa && <p className="text-neutro-700">Nenhum dado geral preenchido ainda.</p>}
        </div>
      </div>

      <div>
        <div className={rotuloClass}>FIRAC</div>
        <div className="mt-2 flex flex-col gap-3">
          {FIRAC_LETRAS.map((letra) => {
            const paragrafos = vinculo.firac.filter((b) => b.letra === letra).map((b) => b.paragrafo);
            return (
              <div key={letra} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-acento text-[13px] text-white">
                  {letra}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-neutro-700">{FIRAC_TITULOS[letra]}</div>
                  {paragrafos.length === 0 ? (
                    <p className="mt-1 text-[13px] text-neutro-700">—</p>
                  ) : (
                    paragrafos.map((p, i) => (
                      <p key={i} className="mt-1 text-[13px] leading-[1.5]">
                        {p}
                      </p>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className={rotuloClass}>Estratégia</div>
        <div className="mt-2 flex flex-col gap-3 text-[13.5px]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Objetivo</div>
            <p className="mt-1">{vinculo.objetivo || "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
                Objetivo secundário
              </div>
              <p className="mt-1">{vinculo.objetivoSecundario || "—"}</p>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutro-700">Linha vermelha</div>
              <p className="mt-1">{vinculo.linhaVermelha || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={rotuloClass}>Argumentos</div>
        {vinculo.argumentos.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-neutro-700">Nenhum argumento registrado.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            {vinculo.argumentos.map((a) => (
              <div key={a.id} className="border-t border-divisoria-fina pt-3">
                <span className="text-[13px] text-acento">{a.tag}</span>
                <h3 className="mt-1 text-[15px] font-normal">{a.titulo}</h3>
                {a.fato && <p className="mt-1 max-w-[80ch] text-[13.5px]">{a.fato}</p>}
                <div className="mt-2 flex flex-col gap-1 text-[13px]">
                  <div>
                    <span className="text-neutro-700">Previsão legal:</span> {a.previsaoLegal || "—"}
                  </div>
                  <div>
                    <span className="text-neutro-700">Jurisprudência:</span> {a.jurisprudencia || "—"}
                  </div>
                  <div>
                    <span className="text-neutro-700">Doutrina:</span> {a.doutrina || "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VinculoDetail({
  vinculo,
  podeEditar,
  onChanged,
  onVoltar,
}: {
  vinculo: Vinculo;
  podeEditar: boolean;
  onChanged: () => Promise<void>;
  onVoltar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [subTab, setSubTab] = useState<0 | 1 | 2>(0);

  const [geraisForm, setGeraisForm] = useState<GeraisForm>(() => buildGeraisForm(vinculo));
  const [estrategiaForm, setEstrategiaForm] = useState<EstrategiaForm>(() => buildEstrategiaForm(vinculo));
  const [salvando, setSalvando] = useState(false);
  const [salvandoEstrategia, setSalvandoEstrategia] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [progressoImport, setProgressoImport] = useState<string | null>(null);
  const [erroImport, setErroImport] = useState<string | null>(null);
  const [removendoAnexo, setRemovendoAnexo] = useState(false);

  const [firacForm, setFiracForm] = useState<FiracForm>(() => buildFiracForm(vinculo));
  const [firacSalvando, setFiracSalvando] = useState(false);
  const [argumentosForm, setArgumentosForm] = useState<ArgumentoForm[]>(() => buildArgumentosForm(vinculo));
  const [argumentosSalvando, setArgumentosSalvando] = useState(false);

  // Ajusta o formulário quando o vínculo muda por fora desta tela (ex.: um
  // import de PDF terminando em segundo plano) — comparação durante a própria
  // renderização (padrão do React pra "resetar estado derivado quando uma
  // prop muda"), não num efeito nem remontando o componente: isso preservaria
  // a sub-aba selecionada e os outros estados só desta tela.
  const [atualizadoEmSincronizado, setAtualizadoEmSincronizado] = useState(vinculo.atualizadoEm);
  if (vinculo.atualizadoEm !== atualizadoEmSincronizado) {
    setAtualizadoEmSincronizado(vinculo.atualizadoEm);
    setGeraisForm(buildGeraisForm(vinculo));
    setEstrategiaForm(buildEstrategiaForm(vinculo));
    setFiracForm(buildFiracForm(vinculo));
    setArgumentosForm(buildArgumentosForm(vinculo));
  }

  const naoLocalizados = camposVinculoNaoLocalizados(vinculo);

  function campo<K extends keyof GeraisForm>(chave: K, valor: GeraisForm[K]) {
    setGeraisForm((f) => ({ ...f, [chave]: valor }));
  }

  function campoEstrategia<K extends keyof EstrategiaForm>(chave: K, valor: EstrategiaForm[K]) {
    setEstrategiaForm((f) => ({ ...f, [chave]: valor }));
  }

  function entrarEmEdicao() {
    setGeraisForm(buildGeraisForm(vinculo));
    setEstrategiaForm(buildEstrategiaForm(vinculo));
    setFiracForm(buildFiracForm(vinculo));
    setArgumentosForm(buildArgumentosForm(vinculo));
    setSubTab(0);
    setEditando(true);
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
      });
      await onChanged();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEstrategia() {
    setSalvandoEstrategia(true);
    try {
      await updateProcessLink(vinculo.id, {
        objetivo: estrategiaForm.objetivo || null,
        objetivoSecundario: estrategiaForm.objetivoSecundario || null,
        linhaVermelha: estrategiaForm.linhaVermelha || null,
      });
      await onChanged();
    } finally {
      setSalvandoEstrategia(false);
    }
  }

  async function excluir() {
    setExcluindo(true);
    try {
      await deleteProcessLink(vinculo.id);
      onVoltar();
      await onChanged();
    } finally {
      setExcluindo(false);
    }
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

  async function removerAnexo() {
    setRemovendoAnexo(true);
    setErroImport(null);
    try {
      await removeProcessLinkAttachment(vinculo.id);
      await onChanged();
    } catch (e) {
      setErroImport(e instanceof Error ? e.message : "Falha ao remover o anexo.");
    } finally {
      setRemovendoAnexo(false);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={editando ? () => setEditando(false) : onVoltar}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro"
        >
          {editando ? "← Voltar à visualização" : "← Voltar aos vínculos"}
        </button>
        {podeEditar && !editando && (
          <button
            type="button"
            onClick={entrarEmEdicao}
            className="border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-tinta-clara"
          >
            Editar
          </button>
        )}
      </div>

      <h2 className="mt-2 text-[17px] font-normal">
        {rotulo}
        {vinculo.numeroProcesso && <span className="text-neutro-700"> · nº {vinculo.numeroProcesso}</span>}
      </h2>

      {naoLocalizados.length > 0 && (
        <div className="mt-4 border-l-[3px] border-ambar bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          A IA não localizou no PDF: {naoLocalizados.join(", ")}. Confira antes de usar.
        </div>
      )}

      {!editando && <ConsolidatedView vinculo={vinculo} />}

      {editando && (
        <>
          <div className="mt-4 flex gap-1 border-b border-divisoria-fina">
            {ETAPAS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setSubTab(i as 0 | 1 | 2)}
                className={`border-b-4 px-3 py-2 text-[12.5px] font-normal uppercase ${
                  subTab === i ? "border-acento text-texto" : "border-transparent text-neutro-700"
                }`}
              >
                4.{i + 1} · {label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {subTab === 0 && (
              <div>
                <div className="grid grid-cols-[180px_1fr_1fr] gap-2">
                  <select
                    className={inputClass}
                    value={geraisForm.tipo}
                    onChange={(e) => campo("tipo", e.target.value as GeraisForm["tipo"])}
                  >
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
                    {vinculo.arquivoAnexoNome ? "Substituir PDF anexado" : "Anexar PDF do processo"}{" "}
                    {importando && <LoadingDots />}
                  </button>
                  {vinculo.arquivoAnexoNome && (
                    <button
                      type="button"
                      onClick={removerAnexo}
                      disabled={removendoAnexo}
                      className="inline-flex items-center gap-2 border border-acento bg-transparent px-2 py-1 text-[10.5px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara disabled:opacity-60"
                    >
                      Remover anexo {removendoAnexo && <LoadingDots />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={excluir}
                    disabled={excluindo}
                    className="ml-auto inline-flex items-center gap-2 border border-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-acento-escuro hover:bg-tinta-clara disabled:opacity-60"
                  >
                    Excluir vínculo {excluindo && <LoadingDots />}
                  </button>
                </div>

                {vinculo.arquivoAnexoNome && !progressoImport && (
                  <div className="mt-2 text-[11.5px] text-neutro-700">Anexo atual: {vinculo.arquivoAnexoNome}</div>
                )}
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

                <div className="mt-6 flex flex-col gap-3">
                  {FIRAC_LETRAS.map((letra) => {
                    const key = letra.toLowerCase() as "f" | "i" | "r" | "a" | "c";
                    return (
                      <div key={letra} className="flex gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-acento text-[13px] text-white">
                          {letra}
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-neutro-700">
                            {FIRAC_TITULOS[letra]}
                          </div>
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
              </div>
            )}

            {subTab === 1 && (
              <div>
                <label className="flex flex-col gap-1">
                  <span className={rotuloClass}>Objetivo</span>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={estrategiaForm.objetivo}
                    onChange={(e) => campoEstrategia("objetivo", e.target.value)}
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className={rotuloClass}>Objetivo secundário</span>
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={estrategiaForm.objetivoSecundario}
                      onChange={(e) => campoEstrategia("objetivoSecundario", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={rotuloClass}>Linha vermelha</span>
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={estrategiaForm.linhaVermelha}
                      onChange={(e) => campoEstrategia("linhaVermelha", e.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={salvarEstrategia}
                  disabled={salvandoEstrategia}
                  className="mt-4 inline-flex items-center gap-2 bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-60"
                >
                  Salvar alterações {salvandoEstrategia && <LoadingDots />}
                </button>
              </div>
            )}

            {subTab === 2 && (
              <div className="flex flex-col gap-3">
                {argumentosForm.map((a, i) => (
                  <div key={i} className="border-t border-divisoria-fina pt-3 first:border-t-0 first:pt-0">
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
