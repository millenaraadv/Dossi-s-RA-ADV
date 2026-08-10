import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canArchiveDossier, assertPermission } from "@/lib/auth/permissions";
import { archiveDossier } from "@/lib/db/queries/dossiers";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canArchiveDossier(user.papel), "Só sócios podem arquivar um dossiê.");

    const { id } = await params;
    await archiveDossier(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
