import "server-only";
import { downloadAuto } from "@/lib/supabase/storage";
import { getImport, updateImportStatus } from "@/lib/db/queries/imports";
import { createDossier, updateDossierGeneral, replaceTimeline, replaceFirac } from "@/lib/db/queries/dossiers";
import { createProcessLink } from "@/lib/db/queries/process-links";
import { buildImportPrompt } from "@/lib/ai/prompts/import-autos";
import { gerarJson } from "@/lib/ai/client";
import { parseImportResult } from "@/lib/ai/parse";
import { extrairTextoDoArquivo } from "@/lib/ai/extract-text";
import { NAO_LOCALIZADO, ROTULOS_CAMPOS_IMPORTADOS as ROTULOS } from "@/lib/dossier-constants";

// Limite defensivo de tamanho do texto enviado à IA — autos muito volumosos
// (milhares de páginas) precisam do caminho por peça/RAG do item 9, não de
// uma chamada única (README 4.1, último parágrafo). Isso aqui só evita
// estourar o contexto do modelo em casos extremos, não é a solução para
// autos volumosos.
const LIMITE_CARACTERES = 400_000;

/**
 * Processa uma importação em segundo plano (chamado sem "await" pela rota
 * POST /api/imports, que já respondeu 202). Sempre termina em status
 * "concluido" ou "erro" — nunca deixa a importação presa em "processando".
 */
export async function processImport(importId: string, actorId: string): Promise<void> {
  try {
    const registro = await getImport(importId);

    const bytes = await downloadAuto(registro.arquivoStorageKey);
    const { texto, paginas } = await extrairTextoDoArquivo(registro.arquivoNome, bytes);

    if (!texto.trim()) {
      throw new Error(
        "Não foi possível extrair texto do arquivo — provavelmente é um PDF digitalizado (imagem escaneada), que ainda não é suportado.",
      );
    }

    await updateImportStatus(importId, { status: "processando", paginasLidas: paginas });

    // Roda em segundo plano (sem await na rota que a chamou) — não tem o
    // limite de proxy do Render que a rota síncrona de sugestões tem, então
    // pode esperar mais por um documento grande.
    const prompt = buildImportPrompt(texto.slice(0, LIMITE_CARACTERES));
    const respostaTexto = await gerarJson(prompt, 60_000);
    const resultado = parseImportResult(respostaTexto);

    // Campo vazio (a IA não achou no texto) vira o texto padrão da revisão
    // obrigatória, e entra na lista de avisos — nunca inferimos o valor.
    const camposFaltantes: string[] = [];
    const valores: Record<keyof typeof ROTULOS, string> = {} as never;
    for (const campo of Object.keys(ROTULOS) as (keyof typeof ROTULOS)[]) {
      const valor = resultado[campo].trim();
      if (!valor) {
        valores[campo] = NAO_LOCALIZADO;
        camposFaltantes.push(ROTULOS[campo]);
      } else {
        valores[campo] = valor;
      }
    }

    const { id: dossierId } = await createDossier(
      {
        cliente: valores.cliente,
        caso: valores.caso,
        numeroProcesso: valores.numeroProcesso,
        materia: resultado.materia,
        responsavelId: null,
      },
      actorId,
      { geradoPorIa: true },
    );

    await updateDossierGeneral(
      dossierId,
      {
        fase: valores.fase,
        orgao: valores.orgao,
        juiz: valores.juiz,
        partes: valores.partes,
        advogadoContrario: valores.advogadoContrario,
        valorCausa: valores.valorCausa,
        resumo: resultado.resumo,
      },
      actorId,
      { viaIa: true },
    );

    const timeline = resultado.timeline.filter((t) => t.dataTexto.trim() && t.ato.trim());
    if (timeline.length > 0) {
      await replaceTimeline(dossierId, timeline, actorId, { viaIa: true });
    }

    const firacNaoVazio = {
      f: resultado.firac.f.filter((p) => p.trim()),
      i: resultado.firac.i.filter((p) => p.trim()),
      r: resultado.firac.r.filter((p) => p.trim()),
      a: resultado.firac.a.filter((p) => p.trim()),
      c: resultado.firac.c.filter((p) => p.trim()),
    };
    await replaceFirac(dossierId, firacNaoVazio, actorId, { viaIa: true });

    for (const vinculo of resultado.vinculos) {
      await createProcessLink(
        dossierId,
        {
          tipo: vinculo.tipo,
          numeroProcesso: vinculo.numeroProcesso.trim() || null,
          tribunalInstancia: vinculo.tribunalInstancia.trim() || null,
          status: vinculo.status.trim() || null,
          resumo: vinculo.resumo.trim() || null,
          resultado: null,
          prazoContagem: null,
          prazoDataTexto: null,
        },
        actorId,
        { viaIa: true },
      );
    }

    await updateImportStatus(importId, {
      status: "concluido",
      dossierId,
      camposFaltantes,
      respostaBruta: resultado,
    });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido ao processar a importação.";
    await updateImportStatus(importId, { status: "erro", erro: mensagem });
  }
}
