import "server-only";
import type { db as Db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

// Aceita tanto o client `db` quanto uma `tx` de transação — ambos expõem `.insert()`.
type Executor = Pick<typeof Db, "insert">;

type AuditEntry = {
  userId: string | null;
  // Sempre informar quando a entidade pertence a um dossiê — é o que permite
  // listar "tudo que mudou neste dossiê" sem juntar contra cada tabela filha.
  dossierId?: string | null;
  entidade: string;
  entidadeId: string;
  acao: string;
  antes?: unknown;
  depois?: unknown;
};

/**
 * Grava uma linha de audit_log. Chamar sempre dentro da mesma transação da
 * mutação que está sendo auditada, para que um rollback desfaça as duas.
 */
export async function audit(executor: Executor, entry: AuditEntry): Promise<void> {
  await executor.insert(auditLog).values({
    userId: entry.userId,
    dossierId: entry.dossierId ?? null,
    entidade: entry.entidade,
    entidadeId: entry.entidadeId,
    acao: entry.acao,
    antes: entry.antes ?? null,
    depois: entry.depois ?? null,
  });
}
