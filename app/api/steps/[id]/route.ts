import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, canRegisterAttempt, assertPermission } from "@/lib/auth/permissions";
import { patchStepSchema } from "@/lib/validation/step";
import { updateStep, deleteStep } from "@/lib/db/queries/steps";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const patch = patchStepSchema.parse(body);

    // Marcar concluído/reabrir é operação de rotina (mesmo papel que registra
    // tentativa); mudar ação/responsável/data é edição de conteúdo da etapa.
    const soConcluido = Object.keys(patch).every((k) => k === "concluido");
    const permitido = soConcluido ? canRegisterAttempt(user.papel) : canEditDossierContent(user.papel);
    assertPermission(permitido, "Seu papel não permite esta alteração.");

    const step = await updateStep(id, patch, user.id);
    return NextResponse.json(step);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite excluir passos.");

    const { id } = await params;
    await deleteStep(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
