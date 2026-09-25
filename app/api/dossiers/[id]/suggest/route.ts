import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canUseAi, assertPermission } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/errors";
import { suggestRequestSchema } from "@/lib/validation/dossier";
import { getDossierFull } from "@/lib/db/queries/dossiers";
import { countRecentSuggestions, createSuggestionRecord } from "@/lib/db/queries/suggestions";
import { gerarJson } from "@/lib/ai/client";
import { buildSuggestEstrategiaPrompt } from "@/lib/ai/prompts/suggest-estrategia";
import { buildSuggestArgumentosPrompt } from "@/lib/ai/prompts/suggest-argumentos";
import { parseSugestaoEstrategia, parseSugestaoArgumentos } from "@/lib/ai/parse-suggestions";
import { hojeIso } from "@/lib/dates";

export const runtime = "nodejs";

const LIMITE_POR_HORA = 20;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertPermission(canUseAi(user.papel), "Você não tem permissão para pedir sugestões à IA.");

    const usadosNaUltimaHora = await countRecentSuggestions(user.id);
    if (usadosNaUltimaHora >= LIMITE_POR_HORA) {
      return NextResponse.json(
        { erro: `Limite de ${LIMITE_POR_HORA} pedidos de sugestão por hora atingido. Tente de novo mais tarde.` },
        { status: 429 },
      );
    }

    const { id } = await params;
    const { etapa } = suggestRequestSchema.parse(await request.json());

    const dossier = await getDossierFull(id);
    if (!dossier) throw new NotFoundError("Dossiê não encontrado.");

    if (etapa === 1) {
      const respostaTexto = await gerarJson(buildSuggestEstrategiaPrompt(dossier, hojeIso()));
      const resultado = parseSugestaoEstrategia(respostaTexto);
      await createSuggestionRecord({ dossierId: id, etapa: "estrategia", criadoPorId: user.id, respostaBruta: resultado });
      return NextResponse.json(resultado);
    }

    const respostaTexto = await gerarJson(buildSuggestArgumentosPrompt(dossier));
    const resultado = parseSugestaoArgumentos(respostaTexto);
    await createSuggestionRecord({ dossierId: id, etapa: "argumentos", criadoPorId: user.id, respostaBruta: resultado });
    return NextResponse.json(resultado);
  } catch (err) {
    return handleRouteError(err);
  }
}
