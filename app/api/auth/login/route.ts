import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Informe email e senha válidos." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error || !data.user) {
    return NextResponse.json({ erro: "Email ou senha inválidos." }, { status: 401 });
  }

  const [profile] = await db.select().from(users).where(eq(users.id, data.user.id)).limit(1);

  if (!profile || !profile.ativo) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { erro: "Usuário sem acesso. Fale com um sócio do escritório." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    id: profile.id,
    nome: profile.nome,
    email: profile.email,
    papel: profile.papel,
    cor: profile.cor,
  });
}
