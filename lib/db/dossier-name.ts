/**
 * "{cliente} - {caso} - Proc. {numero_processo}" — nunca editável pelo usuário
 * (README, entidade `dossiers.nome`). Chamar em toda escrita de `dossiers`.
 */
export function computeDossierName(input: {
  cliente: string;
  caso: string;
  numeroProcesso: string;
}): string {
  return `${input.cliente} - ${input.caso} - Proc. ${input.numeroProcesso}`;
}
