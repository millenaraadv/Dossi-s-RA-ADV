import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { timelineReplaceSchema } from "@/lib/validation/dossier";
import { replaceTimeline } from "@/lib/db/queries/dossiers";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite editar a linha do tempo.");

    const { id } = await params;
    const body = await request.json();
    const entries = timelineReplaceSchema.parse(body);
    await replaceTimeline(id, entries, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
