"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DossierFull } from "@/lib/types/dossier";
import { ETAPAS } from "@/lib/dossier-constants";
import { fetchDossier, patchDossier, putTimeline, putFirac, putArguments, concludeEdit, archiveDossier } from "@/lib/client/dossier-api";
import { AbaGerais } from "@/components/dossier/aba-gerais";
import { AbaEstrategia } from "@/components/dossier/aba-estrategia";
import { AbaArgumentos } from "@/components/dossier/aba-argumentos";
import { VersionsFooter } from "@/components/dossier/versions-footer";
import type { GeraisForm, EstrategiaForm, ArgumentoForm } from "@/components/dossier/types";

type Membro = { id: string; nome: string; cor: string | null };

function buildGeraisForm(d: DossierFull): GeraisForm {
  const byLetra = (l: string) => d.firac.filter((b) => b.letra === l).map((b) => b.paragrafo);
  return {
    materia: d.materia,
    numeroProcesso: d.numeroProcesso,
    fase: d.fase ?? "",
    risco: d.risco,
    valorCausa: d.valorCausa ?? "",
    orgao: d.orgao ?? "",
    juiz: d.juiz ?? "",
    partes: d.partes ?? "",
    advogadoContrario: d.advogadoContrario ?? "",
    responsavelId: d.responsavelId ?? "",
    resumo: d.resumo ?? "",
    camposEspecificos: d.camposEspecificos.map((c) => ({ label: c.label, valor: c.valor })),
    timeline: d.timeline.map((t) => ({ dataTexto: t.dataTexto, ato: t.ato })),
    firac: { f: byLetra("F"), i: byLetra("I"), r: byLetra("R"), a: byLetra("A"), c: byLetra("C") },
  };
}

function buildEstrategiaForm(d: DossierFull): EstrategiaForm {
  return {
    objetivo: d.objetivo ?? "",
    objetivoSecundario: d.objetivoSecundario ?? "",
    linhaVermelha: d.linhaVermelha ?? "",
  };
}

function buildArgumentosForm(d: DossierFull): ArgumentoForm[] {
  return d.argumentos.map((a) => ({
    titulo: a.titulo,
    fato: a.fato ?? "",
    previsaoLegal: a.previsaoLegal ?? "",
    jurisprudencia: a.jurisprudencia ?? "",
    doutrina: a.doutrina ?? "",
  }));
}

export function DossierView({
  dossier: initial,
  membros,
  podeEditar,
  podeRegistrarTentativa,
  podeMarcarPrazo,
  podeArquivar,
}: {
  dossier: DossierFull;
  membros: Membro[];
  podeEditar: boolean;
  podeRegistrarTentativa: boolean;
  podeMarcarPrazo: boolean;
  podeArquivar: boolean;
}) {
  const [dossier, setDossier] = useState(initial);
  const router = useRouter();
  const searchParams = useSearchParams();
  const abaInicial = searchParams.get("aba");
  const [tab, setTab] = useState<0 | 1 | 2>(
    abaInicial === "1" ? 1 : abaInicial === "2" ? 2 : 0,
  );
  const [editAba, setEditAba] = useState<0 | 1 | 2 | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivando, setArquivando] = useState(false);

  const [geraisForm, setGeraisForm] = useState<GeraisForm>(() => buildGeraisForm(initial));
  const [estrategiaForm, setEstrategiaForm] = useState<EstrategiaForm>(() => buildEstrategiaForm(initial));
  const [argumentosForm, setArgumentosForm] = useState<ArgumentoForm[]>(() => buildArgumentosForm(initial));

  function iniciarEdicao(aba: 0 | 1 | 2) {
    setErro(null);
    if (aba === 0) setGeraisForm(buildGeraisForm(dossier));
    if (aba === 1) setEstrategiaForm(buildEstrategiaForm(dossier));
    if (aba === 2) setArgumentosForm(buildArgumentosForm(dossier));
    setEditAba(aba);
  }

  function cancelarEdicao() {
    setEditAba(null);
    setErro(null);
  }

  async function refresh() {
    setDossier(await fetchDossier(dossier.id));
  }

  async function arquivar() {
    const confirmado = window.confirm(
      `Arquivar "${dossier.cliente} - ${dossier.caso}"? Ele some da lista de dossiês ativos, mas o histórico e a auditoria continuam guardados.`,
    );
    if (!confirmado) return;

    setArquivando(true);
    setErro(null);
    try {
      await archiveDossier(dossier.id);
      router.push("/dossies");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível arquivar.");
      setArquivando(false);
    }
  }

  async function concluirGerais() {
    setSalvando(true);
    setErro(null);
    try {
      await patchDossier(dossier.id, {
        materia: geraisForm.materia,
        numeroProcesso: geraisForm.numeroProcesso,
        fase: geraisForm.fase,
        risco: geraisForm.risco,
        valorCausa: geraisForm.valorCausa,
        orgao: geraisForm.orgao,
        juiz: geraisForm.juiz,
        partes: geraisForm.partes,
        advogadoContrario: geraisForm.advogadoContrario,
        resumo: geraisForm.resumo,
        responsavelId: geraisForm.responsavelId || null,
        camposEspecificos: geraisForm.camposEspecificos,
      });
      await putTimeline(dossier.id, geraisForm.timeline.filter((t) => t.dataTexto.trim() || t.ato.trim()));
      await putFirac(dossier.id, geraisForm.firac);
      await concludeEdit(dossier.id, 0);
      setDossier(await fetchDossier(dossier.id));
      setEditAba(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function concluirEstrategia() {
    setSalvando(true);
    setErro(null);
    try {
      await patchDossier(dossier.id, {
        objetivo: estrategiaForm.objetivo,
        objetivoSecundario: estrategiaForm.objetivoSecundario,
        linhaVermelha: estrategiaForm.linhaVermelha,
      });
      await concludeEdit(dossier.id, 1);
      setDossier(await fetchDossier(dossier.id));
      setEditAba(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function concluirArgumentos() {
    setSalvando(true);
    setErro(null);
    try {
      await putArguments(
        dossier.id,
        argumentosForm.filter((a) => a.titulo.trim()),
      );
      await concludeEdit(dossier.id, 2);
      setDossier(await fetchDossier(dossier.id));
      setEditAba(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <Link href="/dossies" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acento-escuro">
        ← Todos os dossiês
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="w-[62%]">
          <h1 className="text-[23px] font-light leading-[1.25] tracking-[0.03em] text-balance">
            {dossier.cliente} - {dossier.caso}
          </h1>
          <p className="mt-1 text-[15px] tracking-[0.1em] text-acento-escuro">Proc. {dossier.numeroProcesso}</p>
        </div>
        <div className="flex items-start gap-2">
          <a
            href={`/api/dossiers/${dossier.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-acento-escuro"
          >
            Imprimir
          </a>
          {podeArquivar && (
            <button
              type="button"
              onClick={arquivar}
              disabled={arquivando}
              className="border border-acento-escuro bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-acento-escuro hover:bg-neutro-200 disabled:opacity-60"
            >
              {arquivando ? "Arquivando…" : "Arquivar"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 border-y border-acento py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-acento-escuro">
          Resumo executivo
        </div>
        {editAba === 0 ? (
          <textarea
            rows={5}
            value={geraisForm.resumo}
            onChange={(e) => setGeraisForm((f) => ({ ...f, resumo: e.target.value }))}
            className="mt-2 w-full max-w-[82ch] border border-borda-campo bg-neutro-100 p-2 text-[14.5px] outline-none"
          />
        ) : (
          <p className="mt-2 max-w-[82ch] text-[14.5px] leading-[1.5]">{dossier.resumo || "—"}</p>
        )}
      </div>

      <div className="mt-6 flex gap-1 border-b border-divisoria-fina">
        {ETAPAS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(i as 0 | 1 | 2)}
            className={`border-b-4 px-3 py-2 text-[12.5px] font-normal uppercase ${
              tab === i ? "border-acento text-texto" : "border-transparent text-neutro-700"
            }`}
          >
            {i + 1} · {label}
          </button>
        ))}
      </div>

      {erro && (
        <div className="mt-4 border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
          {erro}
        </div>
      )}

      <div className="mt-6">
        {tab === 0 && (
          <AbaGerais
            dossier={dossier}
            isEditing={editAba === 0}
            salvando={salvando}
            form={geraisForm}
            setForm={setGeraisForm}
            membros={membros}
            podeEditar={podeEditar}
            onStartEdit={() => iniciarEdicao(0)}
            onCancel={cancelarEdicao}
            onConcluir={concluirGerais}
          />
        )}
        {tab === 1 && (
          <AbaEstrategia
            dossier={dossier}
            isEditing={editAba === 1}
            salvando={salvando}
            form={estrategiaForm}
            setForm={setEstrategiaForm}
            podeEditar={podeEditar}
            podeRegistrarTentativa={podeRegistrarTentativa}
            podeMarcarPrazo={podeMarcarPrazo}
            membros={membros}
            onStartEdit={() => iniciarEdicao(1)}
            onCancel={cancelarEdicao}
            onConcluir={concluirEstrategia}
            onPassosChanged={refresh}
            onPrazosChanged={refresh}
          />
        )}
        {tab === 2 && (
          <AbaArgumentos
            dossier={dossier}
            isEditing={editAba === 2}
            salvando={salvando}
            form={argumentosForm}
            setForm={setArgumentosForm}
            podeEditar={podeEditar}
            onStartEdit={() => iniciarEdicao(2)}
            onCancel={cancelarEdicao}
            onConcluir={concluirArgumentos}
          />
        )}
      </div>

      <VersionsFooter dossier={dossier} />
    </main>
  );
}
