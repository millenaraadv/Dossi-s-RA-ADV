import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { createProcessLinkSchema } from "@/lib/validation/process-link";
import { createProcessLink } from "@/lib/db/queries/process-links";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite adicionar vínculos processuais.");

    const { id } = await params;
    const body = await request.json();
    const input = createProcessLinkSchema.parse(body);
    const vinculo = await createProcessLink(id, input, user.id, { viaIa: body?.viaIa === true });

    return NextResponse.json(vinculo, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
