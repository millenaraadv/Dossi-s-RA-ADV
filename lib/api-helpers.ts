import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/errors";

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ erro: "Dados inválidos.", detalhes: err.issues }, { status: 400 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ erro: err.message }, { status: 403 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ erro: err.message }, { status: 404 });
  }
  console.error(err);
  return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
}
