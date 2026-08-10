import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Papel } from "@/lib/auth/permissions";

export type SessionUser = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  cor: string | null;
  ativo: boolean;
};

/**
 * `getUser()` (não `getSession()`) porque revalida o token contra o Supabase
 * em vez de só decodificar o JWT local — é a chamada segura para o servidor.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const [row] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!row || !row.ativo) return null;

  return row;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
