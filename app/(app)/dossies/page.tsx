import { requireUser } from "@/lib/auth/session";
import { listDossiers, countDossiersAtivos } from "@/lib/db/queries/dossier-list";
import { listActiveUsers } from "@/lib/db/queries/users";
import { DossiesList } from "@/components/dossier-list/list";

export default async function DossiesPage() {
  await requireUser();

  const [itens, total, membros] = await Promise.all([
    listDossiers({ ordem: "alfabetica" }),
    countDossiersAtivos(),
    listActiveUsers(),
  ]);

  return <DossiesList itensIniciais={itens} totalInicial={total} membros={membros} />;
}
