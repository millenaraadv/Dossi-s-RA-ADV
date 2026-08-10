import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { createStepSchema } from "@/lib/validation/step";
import { createStep } from "@/lib/db/queries/steps";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite adicionar passos.");

    const { id } = await params;
    const body = await request.json();
    const input = createStepSchema.parse(body);
    const step = await createStep(id, input, user.id);

    return NextResponse.json(step, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
