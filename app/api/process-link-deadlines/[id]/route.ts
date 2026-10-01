import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, canMarkDeadlineStage, assertPermission } from "@/lib/auth/permissions";
import { patchDeadlineSchema, temCamposDeConteudo } from "@/lib/validation/deadline";
import { updateProcessLinkDeadline, deleteProcessLinkDeadline } from "@/lib/db/queries/process-link-deadlines";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const patch = patchDeadlineSchema.parse(body);

    const permitido = temCamposDeConteudo(patch)
      ? canEditDossierContent(user.papel)
      : canMarkDeadlineStage(user.papel);
    assertPermission(permitido, "Seu papel não permite esta alteração.");

    const deadline = await updateProcessLinkDeadline(id, patch, user.id);
    return NextResponse.json(deadline);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite excluir prazos.");

    const { id } = await params;
    await deleteProcessLinkDeadline(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
