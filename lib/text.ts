// Nome curto para chips/legendas: primeiro + segundo nome ("Millena Frias" → "Millena Frias", "Hermelinda Rabelo" → "Hermelinda Rabelo").
export function nomeCurto(nome: string): string {
  const partes = nome.split(" ");
  return partes.length > 1 ? `${partes[0]} ${partes[1]}` : nome;
}
