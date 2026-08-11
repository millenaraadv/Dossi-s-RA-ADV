import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { LogoDossies } from "@/components/logo-dossies";
import { NovoDossieLauncher } from "@/components/modals/novo-dossie-launcher";
import { listActiveUsers } from "@/lib/db/queries/users";
import { canEditDossierContent, type Papel } from "@/lib/auth/permissions";

const navButton =
  "px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap";

export async function Topbar({ papel }: { papel: Papel }) {
  const membros = canEditDossierContent(papel) ? await listActiveUsers() : [];

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-acento bg-ground px-8 py-4">
      <div className="flex items-center gap-4">
        <Image
          src="/assets/marca-rabelo-aguiar.png"
          alt="Rabelo Aguiar Advocacia"
          width={266}
          height={68}
          style={{ height: 68, width: "auto" }}
          priority
        />
        <div className="h-8 w-px bg-divisoria-fina" aria-hidden />
        <LogoDossies className="h-6 w-auto" />
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        <Link
          href="/dossies"
          className={`${navButton} border border-acento bg-transparent text-texto hover:bg-neutro-200`}
        >
          Dossiês
        </Link>
        <Link
          href="/calendario"
          className={`${navButton} border border-acento bg-transparent text-texto hover:bg-neutro-200`}
        >
          Calendário
        </Link>
        <button
          type="button"
          disabled
          title="Disponível a partir do item 6 da implementação"
          className={`${navButton} border border-acento bg-transparent text-acento-escuro hover:bg-tinta-clara disabled:cursor-default disabled:opacity-60`}
        >
          Importar autos
        </button>
        {canEditDossierContent(papel) && <NovoDossieLauncher membros={membros} />}
        <LogoutButton />
      </nav>
    </header>
  );
}
