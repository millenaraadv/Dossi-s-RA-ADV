import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canUseAi, assertPermission } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/api-helpers";
import { suggestRequestSchema } from "@/lib/validation/dossier";
import { getProcessLinkWithContext } from "@/lib/db/queries/process-links";
import { countRecentSuggestions, createSuggestionRecord } from "@/lib/db/queries/suggestions";
import { gerarJson, gerarComBusca } from "@/lib/ai/client";
import { buildContextoVinculo } from "@/lib/ai/prompts/contexto-vinculo";
import { buildSuggestFiracVinculoPrompt } from "@/lib/ai/prompts/suggest-firac-vinculo";
import { buildSuggestEstrategiaVinculoPrompt } from "@/lib/ai/prompts/suggest-estrategia-vinculo";
import { buildSuggestArgumentosPrompt } from "@/lib/ai/prompts/suggest-argumentos";
import {
  parseSugestaoFiracVinculo,
  parseSugestaoEstrategiaVinculo,
  parseSugestaoArgumentos,
} from "@/lib/ai/parse-suggestions";
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

    const vinculo = await getProcessLinkWithContext(id);
    const contexto = buildContextoVinculo(vinculo);

    if (etapa === 0) {
      const respostaTexto = await gerarJson(buildSuggestFiracVinculoPrompt(contexto));
      const resultado = parseSugestaoFiracVinculo(respostaTexto);
      await createSuggestionRecord({
        dossierId: vinculo.dossierId,
        etapa: "firac",
        criadoPorId: user.id,
        respostaBruta: resultado,
      });
      return NextResponse.json(resultado);
    }

    if (etapa === 1) {
      const respostaTexto = await gerarJson(buildSuggestEstrategiaVinculoPrompt(contexto, hojeIso()));
      const resultado = parseSugestaoEstrategiaVinculo(respostaTexto);
      await createSuggestionRecord({
        dossierId: vinculo.dossierId,
        etapa: "estrategia",
        criadoPorId: user.id,
        respostaBruta: resultado,
      });
      return NextResponse.json(resultado);
    }

    const { texto: respostaTexto, fontes } = await gerarComBusca(buildSuggestArgumentosPrompt(contexto));
    const resultado = parseSugestaoArgumentos(respostaTexto, fontes);
    await createSuggestionRecord({
      dossierId: vinculo.dossierId,
      etapa: "argumentos",
      criadoPorId: user.id,
      respostaBruta: resultado,
    });
    return NextResponse.json(resultado);
  } catch (err) {
    return handleRouteError(err);
  }
}
