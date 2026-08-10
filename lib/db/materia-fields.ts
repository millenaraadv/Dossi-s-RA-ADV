import type { materiaEnum } from "@/lib/db/schema";

type Materia = (typeof materiaEnum.enumValues)[number];

/**
 * Campo específico por matéria (README, entidade `dossier_fields`). Todas as
 * matérias incluem "Provisão / risco estimado" além do campo próprio.
 */
const MATERIA_LABEL: Record<Materia, string> = {
  "Cível": "Objeto do contrato",
  "Trabalhista": "Período contratual",
  "Tributário": "Tributos discutidos",
  "Empresarial": "Participação societária",
  "Família e sucessões": "Regime de bens",
  "Consumidor": "Produto ou serviço",
};

export function camposIniciaisPorMateria(materia: Materia): { label: string; valor: string; ordem: number }[] {
  return [
    { label: MATERIA_LABEL[materia], valor: "", ordem: 0 },
    { label: "Provisão / risco estimado", valor: "", ordem: 1 },
  ];
}
