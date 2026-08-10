import "server-only";

export type Papel = "socio" | "advogado" | "estagiario" | "admin";

/**
 * Regras da Parte 2 do README, com um desvio pedido explicitamente pelo
 * escritório: o README define `admin` como só "usuários e configuração, sem
 * acesso a conteúdo de dossiê", mas aqui `admin` tem acesso total, igual a
 * `socio` (inclusive conteúdo de dossiê e arquivamento).
 * - socio/admin: tudo, inclusive arquivar dossiê e gerenciar usuários
 * - advogado: lê e edita qualquer dossiê (transparência interna)
 * - estagiario: lê tudo; registra tentativa e marca etapas de prazo; NÃO edita
 *   FIRAC, estratégia nem argumentos
 */

/** socio e admin têm acesso equivalente a tudo. */
function isSuperRole(papel: Papel): boolean {
  return papel === "socio" || papel === "admin";
}

/** Pode ler dados de processo (dossiês, calendário, etc). */
export function canReadDossiers(papel: Papel): boolean {
  return isSuperRole(papel) || papel === "advogado" || papel === "estagiario";
}

/** Pode editar campos gerais, FIRAC, estratégia (objetivo/passos) e argumentos. */
export function canEditDossierContent(papel: Papel): boolean {
  return isSuperRole(papel) || papel === "advogado";
}

/** Pode registrar tentativa em um passo. */
export function canRegisterAttempt(papel: Papel): boolean {
  return isSuperRole(papel) || papel === "advogado" || papel === "estagiario";
}

/** Pode marcar/desmarcar as três etapas de um prazo (redação/correção/protocolo). */
export function canMarkDeadlineStage(papel: Papel): boolean {
  return isSuperRole(papel) || papel === "advogado" || papel === "estagiario";
}

/** Pode arquivar dossiê. */
export function canArchiveDossier(papel: Papel): boolean {
  return isSuperRole(papel);
}

/** Pode criar/desativar usuários. */
export function canManageUsers(papel: Papel): boolean {
  return isSuperRole(papel);
}

/** Pode disparar chamadas de IA (importação, sugestões). */
export function canUseAi(papel: Papel): boolean {
  return isSuperRole(papel) || papel === "advogado";
}

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertPermission(allowed: boolean, message?: string): void {
  if (!allowed) throw new ForbiddenError(message);
}
