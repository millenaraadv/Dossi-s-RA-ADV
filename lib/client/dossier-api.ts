import type { DossierFull } from "@/lib/types/dossier";

async function asJsonOrThrow(res: Response) {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.erro ?? "Não foi possível salvar.");
  }
  return res.json();
}

export async function fetchDossier(id: string): Promise<DossierFull> {
  const res = await fetch(`/api/dossiers/${id}`);
  return asJsonOrThrow(res);
}

export async function patchDossier(
  id: string,
  patch: Record<string, unknown>,
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function putTimeline(id: string, entries: { dataTexto: string; ato: string }[]): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}/timeline`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    }),
  );
}

export async function putFirac(
  id: string,
  firac: { f: string[]; i: string[]; r: string[]; a: string[]; c: string[] },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}/firac`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firac),
    }),
  );
}

export async function putArguments(
  id: string,
  args: { titulo: string; fato: string; previsaoLegal: string; jurisprudencia: string; doutrina: string }[],
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}/arguments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function concludeEdit(id: string, etapa: 0 | 1 | 2): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}/conclude-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    }),
  );
}

export async function createStep(
  dossierId: string,
  input: { acao: string; responsavelId: string | null; proximaData: string | null },
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function updateStep(
  stepId: string,
  patch: Partial<{ acao: string; responsavelId: string | null; proximaData: string | null; concluido: boolean }>,
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteStep(stepId: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/steps/${stepId}`, { method: "DELETE" }));
}

export async function addAttempt(stepId: string, input: { data: string; resultado: string }): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/steps/${stepId}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function createDeadline(
  dossierId: string,
  input: { ato: string; contagem: string | null; dataTexto: string | null },
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/deadlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function updateDeadline(
  deadlineId: string,
  patch: Partial<{
    ato: string;
    contagem: string | null;
    dataTexto: string | null;
    redacaoOk: boolean;
    redacaoLink: string | null;
    correcaoOk: boolean;
    correcaoPorId: string | null;
    protocoloOk: boolean;
    protocoloData: string | null;
  }>,
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/deadlines/${deadlineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteDeadline(deadlineId: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/deadlines/${deadlineId}`, { method: "DELETE" }));
}

export async function archiveDossier(id: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/dossiers/${id}/archive`, { method: "POST" }));
}

export type ProcessLinkInput = {
  tipo: string;
  numeroProcesso: string | null;
  tribunalInstancia: string | null;
  status: string | null;
  resumo: string | null;
  resultado: string | null;
  prazoContagem: string | null;
  prazoDataTexto: string | null;
  partes: string | null;
  juiz: string | null;
  fase: string | null;
  valorCausa: string | null;
  advogadoContrario: string | null;
  risco?: string;
  objetivo: string | null;
  objetivoSecundario: string | null;
  linhaVermelha: string | null;
  camposEspecificos?: { label: string; valor: string }[];
};

export async function createProcessLink(
  dossierId: string,
  input: ProcessLinkInput,
  opcoes?: { viaIa?: boolean },
): Promise<{ id: string }> {
  return asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/process-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function updateProcessLink(
  id: string,
  patch: Partial<ProcessLinkInput>,
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function deleteProcessLink(id: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/process-links/${id}`, { method: "DELETE" }));
}

export async function putProcessLinkFirac(
  id: string,
  firac: { f: string[]; i: string[]; r: string[]; a: string[]; c: string[] },
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-links/${id}/firac`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...firac, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function putProcessLinkArguments(
  id: string,
  args: { titulo: string; fato: string; previsaoLegal: string; jurisprudencia: string; doutrina: string }[],
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-links/${id}/arguments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function putProcessLinkTimeline(
  id: string,
  entries: { dataTexto: string; ato: string }[],
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-links/${id}/timeline`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function createProcessLinkStep(
  processLinkId: string,
  input: { acao: string; responsavelId: string | null; proximaData: string | null },
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-links/${processLinkId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function updateProcessLinkStep(
  stepId: string,
  patch: Partial<{ acao: string; responsavelId: string | null; proximaData: string | null; concluido: boolean }>,
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-link-steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteProcessLinkStep(stepId: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/process-link-steps/${stepId}`, { method: "DELETE" }));
}

export async function addProcessLinkStepAttempt(
  stepId: string,
  input: { data: string; resultado: string },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-link-steps/${stepId}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function createProcessLinkDeadline(
  processLinkId: string,
  input: { ato: string; contagem: string | null; dataTexto: string | null },
  opcoes?: { viaIa?: boolean },
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-links/${processLinkId}/deadlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, viaIa: opcoes?.viaIa === true }),
    }),
  );
}

export async function updateProcessLinkDeadline(
  deadlineId: string,
  patch: Partial<{
    ato: string;
    contagem: string | null;
    dataTexto: string | null;
    redacaoOk: boolean;
    redacaoLink: string | null;
    correcaoOk: boolean;
    correcaoPorId: string | null;
    protocoloOk: boolean;
    protocoloData: string | null;
  }>,
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/process-link-deadlines/${deadlineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteProcessLinkDeadline(deadlineId: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/process-link-deadlines/${deadlineId}`, { method: "DELETE" }));
}

export type ProcessLinkImportStatusResponse = {
  status: "lendo" | "processando" | "concluido" | "erro";
  erro: string | null;
  camposFaltantes: string[];
  processLinkId: string | null;
};

export async function importProcessLinkPdf(processLinkId: string, arquivo: File): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  const res = await fetch(`/api/process-links/${processLinkId}/import`, { method: "POST", body: formData });
  if (res.status !== 202) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.erro ?? "Não foi possível iniciar a importação.");
  }
  return res.json();
}

export async function getProcessLinkImportStatus(importId: string): Promise<ProcessLinkImportStatusResponse> {
  return asJsonOrThrow(await fetch(`/api/process-link-imports/${importId}`));
}

export async function removeProcessLinkAttachment(processLinkId: string): Promise<void> {
  await asJsonOrThrow(await fetch(`/api/process-links/${processLinkId}/import`, { method: "DELETE" }));
}

export type SugestaoEstrategia = {
  objetivo: string;
  objetivoSecundario: string;
  linhaVermelha: string;
  passos: { acao: string; proximaData: string }[];
  prazos: { ato: string; contagem: string; dataTexto: string }[];
  riscos: string[];
};

export type SugestaoArgumento = {
  titulo: string;
  fato: string;
  previsaoLegal: string;
  jurisprudencia: string;
  doutrina: string;
};

export async function suggestEstrategia(dossierId: string): Promise<SugestaoEstrategia> {
  return asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: 1 }),
    }),
  );
}

export type FonteConsultada = { titulo: string; url: string };

export async function suggestArgumentos(
  dossierId: string,
): Promise<{ argumentos: SugestaoArgumento[]; fontes: FonteConsultada[] }> {
  return asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: 2 }),
    }),
  );
}

export type SugestaoFiracVinculo = {
  resumo: string;
  resultado: string;
  timeline: { dataTexto: string; ato: string }[];
  f: string;
  i: string;
  r: string;
  a: string;
  c: string;
};

export async function suggestFiracVinculo(processLinkId: string): Promise<SugestaoFiracVinculo> {
  return asJsonOrThrow(
    await fetch(`/api/process-links/${processLinkId}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: 0 }),
    }),
  );
}

export type SugestaoEstrategiaVinculo = {
  objetivo: string;
  objetivoSecundario: string;
  linhaVermelha: string;
  passos: { acao: string; proximaData: string }[];
  prazos: { ato: string; contagem: string; dataTexto: string }[];
  riscos: string[];
};

export async function suggestEstrategiaVinculo(processLinkId: string): Promise<SugestaoEstrategiaVinculo> {
  return asJsonOrThrow(
    await fetch(`/api/process-links/${processLinkId}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: 1 }),
    }),
  );
}

export async function suggestArgumentosVinculo(
  processLinkId: string,
): Promise<{ argumentos: SugestaoArgumento[]; fontes: FonteConsultada[] }> {
  return asJsonOrThrow(
    await fetch(`/api/process-links/${processLinkId}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: 2 }),
    }),
  );
}
