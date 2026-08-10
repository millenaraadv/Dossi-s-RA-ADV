import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function listActiveUsers() {
  return db
    .select({ id: users.id, nome: users.nome, cor: users.cor, papel: users.papel })
    .from(users)
    .where(eq(users.ativo, true))
    .orderBy(asc(users.nome));
}
