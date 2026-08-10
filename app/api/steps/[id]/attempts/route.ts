import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canRegisterAttempt, assertPermission } from "@/lib/auth/permissions";
import { createAttemptSchema } from "@/lib/validation/step";
import { addAttempt } from "@/lib/db/queries/steps";
import { handleRouteError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canRegisterAttempt(user.papel), "Seu papel não permite registrar tentativas.");

    const { id } = await params;
    const body = await request.json();
    const input = createAttemptSchema.parse(body);
    const attempt = await addAttempt(id, input, user.id);

    return NextResponse.json(attempt, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
