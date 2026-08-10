import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, users } from "@/lib/db/schema";
import { describeAuditEntry } from "@/lib/audit-describe";

export type AuditTrailEntry = {
  id: string;
  entidade: string;
  acao: string;
  autor: string | null;
  criadoEm: string;
  descricao: string;
};

export async function getDossierAuditTrail(dossierId: string): Promise<AuditTrailEntry[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      entidade: auditLog.entidade,
      acao: auditLog.acao,
      antes: auditLog.antes,
      depois: auditLog.depois,
      criadoEm: auditLog.criadoEm,
      autor: users.nome,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(eq(auditLog.dossierId, dossierId))
    .orderBy(desc(auditLog.criadoEm));

  return rows.map((r) => ({
    id: r.id,
    entidade: r.entidade,
    acao: r.acao,
    autor: r.autor,
    criadoEm: r.criadoEm,
    descricao: describeAuditEntry(r),
  }));
}
