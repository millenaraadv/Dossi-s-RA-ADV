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

export async function patchDossier(id: string, patch: Record<string, unknown>): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${id}/arguments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
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
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
): Promise<void> {
  await asJsonOrThrow(
    await fetch(`/api/dossiers/${dossierId}/deadlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
