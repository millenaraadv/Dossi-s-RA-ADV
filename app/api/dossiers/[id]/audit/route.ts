import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canReadDossiers, assertPermission } from "@/lib/auth/permissions";
import { getDossierAuditTrail } from "@/lib/db/queries/audit";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canReadDossiers(user.papel));

    const { id } = await params;
    const trilha = await getDossierAuditTrail(id);

    return NextResponse.json(trilha);
  } catch (err) {
    return handleRouteError(err);
  }
}
