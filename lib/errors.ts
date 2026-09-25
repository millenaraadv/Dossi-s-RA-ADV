export class NotFoundError extends Error {
  constructor(message = "Registro não encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

// Erro de um provedor de IA já traduzido para uma mensagem em português
// acionável (ver lib/ai/client.ts) — precisa de um tipo próprio para não cair
// no "Erro interno." genérico de handleRouteError (lib/api-helpers.ts), que
// existe justamente para não vazar detalhe interno ao usuário.
export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}
