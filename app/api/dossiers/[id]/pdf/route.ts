import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canReadDossiers, assertPermission } from "@/lib/auth/permissions";
import { getDossierFull } from "@/lib/db/queries/dossiers";
import { renderDossierPdf } from "@/lib/pdf/render";
import { buildDossierPdfFilename } from "@/lib/pdf/filename";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canReadDossiers(user.papel));

    const { id } = await params;
    const dossier = await getDossierFull(id);
    if (!dossier) return NextResponse.json({ erro: "Dossiê não encontrado." }, { status: 404 });

    const pdf = await renderDossierPdf(dossier);
    const nomeArquivo = buildDossierPdfFilename(dossier);
    // ASCII puro para o fallback `filename=`; `filename*` carrega o nome com acentos (RFC 6266).
    const nomeAscii = nomeArquivo.normalize("NFD").replace(/[̀-ͯ]/g, "");

    return new NextResponse(new Blob([Uint8Array.from(pdf)]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
