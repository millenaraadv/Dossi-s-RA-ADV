import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, canReadDossiers, assertPermission } from "@/lib/auth/permissions";
import { createDossierSchema } from "@/lib/validation/dossier";
import { createDossier } from "@/lib/db/queries/dossiers";
import { listDossiers, countDossiersAtivos, type OrdemLista } from "@/lib/db/queries/dossier-list";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertPermission(canReadDossiers(user.papel));

    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const responsavel = url.searchParams.get("responsavel") ?? undefined;
    const ordemParam = url.searchParams.get("ordem");
    const ordem: OrdemLista = ordemParam === "recente" ? "recente" : "alfabetica";

    const [itens, total] = await Promise.all([
      listDossiers({ q, responsavelId: responsavel, ordem }),
      countDossiersAtivos(),
    ]);

    return NextResponse.json({ itens, total });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite criar dossiês.");

    const body = await request.json();
    const input = createDossierSchema.parse(body);
    const { id } = await createDossier(input, user.id);

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
