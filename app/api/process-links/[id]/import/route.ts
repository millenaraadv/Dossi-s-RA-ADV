import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canUseAi, canEditDossierContent, assertPermission } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/api-helpers";
import { createProcessLinkImportRecord, countRecentProcessLinkImports } from "@/lib/db/queries/process-link-imports";
import { setProcessLinkAttachment, removeProcessLinkAttachment } from "@/lib/db/queries/process-links";
import { uploadAuto } from "@/lib/supabase/storage";
import { processVinculoImport } from "@/lib/ai/import-processor-vinculo";

export const runtime = "nodejs";

const LIMITE_POR_HORA = 10;
const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canUseAi(user.papel), "Você não tem permissão para importar autos.");

    const { id } = await params;

    const usadosNaUltimaHora = await countRecentProcessLinkImports(user.id);
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
    const storageKey = `${user.id}/vinculo-${id}-${Date.now()}-${arquivo.name}`;
    await uploadAuto(storageKey, bytes, arquivo.type || "application/octet-stream");
    // Marca o anexo já aqui (antes mesmo da IA processar) — se o usuário
    // subiu o arquivo errado, "Remover anexo" precisa funcionar mesmo que a
    // extração falhe ou ainda esteja rodando.
    await setProcessLinkAttachment(id, { arquivoNome: arquivo.name, arquivoStorageKey: storageKey });

    const { id: importId } = await createProcessLinkImportRecord({
      processLinkId: id,
      arquivoNome: arquivo.name,
      arquivoStorageKey: storageKey,
      criadoPorId: user.id,
    });

    // Não aguardamos: a rota responde 202 na hora, e o cliente acompanha o
    // progresso fazendo polling em GET /api/process-link-imports/:id.
    processVinculoImport(importId, user.id).catch((err) =>
      console.error("Falha ao processar importação de vínculo em segundo plano:", err),
    );

    return NextResponse.json({ id: importId }, { status: 202 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canEditDossierContent(user.papel), "Seu papel não permite remover anexos.");

    const { id } = await params;
    await removeProcessLinkAttachment(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
