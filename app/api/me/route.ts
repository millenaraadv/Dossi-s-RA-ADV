import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
    cor: user.cor,
  });
}
