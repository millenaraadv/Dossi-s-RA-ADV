import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canUseAi, assertPermission } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/api-helpers";
import { getProcessLinkImport } from "@/lib/db/queries/process-link-imports";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canUseAi(user.papel), "Você não tem permissão para ver esta importação.");

    const { id } = await params;
    const registro = await getProcessLinkImport(id);

    return NextResponse.json({
      id: registro.id,
      status: registro.status,
      erro: registro.erro,
      camposFaltantes: registro.camposFaltantes,
      processLinkId: registro.processLinkId,
      paginasLidas: registro.paginasLidas,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
