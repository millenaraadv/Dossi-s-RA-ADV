import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canUseAi, assertPermission } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/api-helpers";
import { createImportRecord, countRecentImports } from "@/lib/db/queries/imports";
import { uploadAuto } from "@/lib/supabase/storage";
import { processImport } from "@/lib/ai/import-processor";

export const runtime = "nodejs";

const LIMITE_POR_HORA = 10;
const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertPermission(canUseAi(user.papel), "Você não tem permissão para importar autos.");

    const usadosNaUltimaHora = await countRecentImports(user.id);
    if (usadosNaUltimaHora >= LIMITE_POR_HORA) {
      return NextResponse.json(
        { erro: `Limite de ${LIMITE_POR_HORA} importações por hora atingido. Tente de novo mais tarde.` },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: "Envie um arquivo." }, { status: 400 });
    }

    const nomeMinusculo = arquivo.name.toLowerCase();
    if (!nomeMinusculo.endsWith(".pdf") && !nomeMinusculo.endsWith(".txt")) {
      return NextResponse.json({ erro: "Só são aceitos arquivos .pdf ou .txt." }, { status: 400 });
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ erro: "Arquivo maior que 20MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const storageKey = `${user.id}/${Date.now()}-${arquivo.name}`;
    await uploadAuto(storageKey, bytes, arquivo.type || "application/octet-stream");

    const { id } = await createImportRecord({
      arquivoNome: arquivo.name,
      arquivoStorageKey: storageKey,
      criadoPorId: user.id,
    });

    // Não aguardamos: a rota responde 202 na hora, e o cliente acompanha o
    // progresso fazendo polling em GET /api/imports/:id.
    processImport(id, user.id).catch((err) => console.error("Falha ao processar importação em segundo plano:", err));

    return NextResponse.json({ id }, { status: 202 });
  } catch (err) {
    return handleRouteError(err);
  }
}
