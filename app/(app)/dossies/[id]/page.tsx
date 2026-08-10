import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canEditDossierContent, canRegisterAttempt, canMarkDeadlineStage, canArchiveDossier } from "@/lib/auth/permissions";
import { getDossierFull } from "@/lib/db/queries/dossiers";
import { listActiveUsers } from "@/lib/db/queries/users";
import { DossierView } from "@/components/dossier/dossier-view";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const dossier = await getDossierFull(id);
  if (!dossier) notFound();

  // Todo papel que lê dossiê também registra tentativa/marca prazo, então a
  // equipe é sempre necessária (select "quem corrigiu", responsáveis etc).
  const membros = await listActiveUsers();

  return (
    <DossierView
      dossier={dossier}
      membros={membros}
      podeEditar={canEditDossierContent(user.papel)}
      podeRegistrarTentativa={canRegisterAttempt(user.papel)}
      podeMarcarPrazo={canMarkDeadlineStage(user.papel)}
      podeArquivar={canArchiveDossier(user.papel)}
    />
  );
}
