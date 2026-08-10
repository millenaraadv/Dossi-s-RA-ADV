import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { firacReplaceSchema } from "@/lib/validation/dossier";
import { replaceFirac } from "@/lib/db/queries/dossiers";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite editar o FIRAC.");

    const { id } = await params;
    const body = await request.json();
    const firac = firacReplaceSchema.parse(body);
    await replaceFirac(id, firac, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
