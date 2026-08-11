// Nome curto para chips/legendas: primeiro + segundo nome ("Millena Frias" → "Millena Frias", "Hermelinda Rabelo" → "Hermelinda Rabelo").
export function nomeCurto(nome: string): string {
  const partes = nome.split(" ");
  return partes.length > 1 ? `${partes[0]} ${partes[1]}` : nome;
}

const PREPOSICOES_MINUSCULAS = new Set(["de", "da", "do", "das", "dos"]);

function capitalizarPalavra(palavra: string): string {
  if (!palavra) return palavra;
  const minuscula = palavra.toLowerCase();
  if (PREPOSICOES_MINUSCULAS.has(minuscula)) return minuscula;

  return palavra
    .split("-")
    .map((parte) => (parte ? parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase() : parte))
    .join("-");
}

/**
 * "JOÃO DA SILVA LTDA" → "João da Silva Ltda" — usado em nomes de pessoa
 * física/jurídica (cliente, advogado contrário, magistrado, partes).
 * Sempre reorganiza para maiúscula-inicial/resto-minúsculo por palavra,
 * independente de como foi digitado (tudo maiúsculo, tudo minúsculo, etc.);
 * preposições/artigos (de, da, do, das, dos) ficam sempre minúsculos. Siglas
 * como "OAB/SC" também são normalizadas ("Oab/Sc") — o ganho de sempre
 * corrigir nomes digitados em caixa alta pesa mais que preservar essas siglas
 * pontuais.
 */
export function capitalizarNome(nome: string): string {
  return nome.split(" ").map(capitalizarPalavra).join(" ");
}
