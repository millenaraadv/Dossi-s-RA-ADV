import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { patchProcessLinkSchema } from "@/lib/validation/process-link";
import { updateProcessLink, deleteProcessLink } from "@/lib/db/queries/process-links";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite editar vínculos processuais.");

    const { id } = await params;
    const body = await request.json();
    const patch = patchProcessLinkSchema.parse(body);
    const vinculo = await updateProcessLink(id, patch, user.id);

    return NextResponse.json(vinculo);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite excluir vínculos processuais.");

    const { id } = await params;
    await deleteProcessLink(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
