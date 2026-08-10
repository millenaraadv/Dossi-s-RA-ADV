import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { createDeadlineSchema } from "@/lib/validation/deadline";
import { createDeadline } from "@/lib/db/queries/deadlines";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite adicionar prazos.");

    const { id } = await params;
    const body = await request.json();
    const input = createDeadlineSchema.parse(body);
    const deadline = await createDeadline(id, input, user.id);

    return NextResponse.json(deadline, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
