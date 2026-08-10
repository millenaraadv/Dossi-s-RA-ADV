import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canReadDossiers, canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { patchDossierSchema } from "@/lib/validation/dossier";
import { getDossierFull, updateDossierGeneral } from "@/lib/db/queries/dossiers";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canReadDossiers(user.papel));

    const { id } = await params;
    const dossier = await getDossierFull(id);
    if (!dossier) return NextResponse.json({ erro: "Dossiê não encontrado." }, { status: 404 });

    return NextResponse.json(dossier);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite editar este dossiê.");

    const { id } = await params;
    const body = await request.json();
    const patch = patchDossierSchema.parse(body);
    await updateDossierGeneral(id, patch, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
