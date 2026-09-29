import "server-only";
import { downloadAuto } from "@/lib/supabase/storage";
import { getProcessLinkImport, updateProcessLinkImportStatus } from "@/lib/db/queries/process-link-imports";
import { updateProcessLink, replaceProcessLinkFirac, replaceProcessLinkArguments } from "@/lib/db/queries/process-links";
import { buildImportVinculoPrompt } from "@/lib/ai/prompts/import-vinculo";
import { gerarJson } from "@/lib/ai/client";
import { parseImportVinculoResult } from "@/lib/ai/parse-vinculo";
import { extrairTextoDoArquivo } from "@/lib/ai/extract-text";
import { NAO_LOCALIZADO, ROTULOS_CAMPOS_VINCULO as ROTULOS } from "@/lib/dossier-constants";

const LIMITE_CARACTERES = 400_000;

/**
 * Processa a importação de PDF de um processo VINCULADO (chamado sem "await"
 * pela rota POST /api/process-links/:id/import, que já respondeu 202) —
 * diferente de processImport (lib/ai/import-processor.ts), não cria um
 * dossiê novo: enriquece os campos de "mini-dossiê" de um process_link que
 * já existe. Sempre termina em status "concluido" ou "erro".
 */
export async function processVinculoImport(importId: string, actorId: string): Promise<void> {
  try {
    const registro = await getProcessLinkImport(importId);
    if (!registro.processLinkId) {
      throw new Error("Vínculo processual associado a esta importação não foi encontrado.");
    }
    const processLinkId = registro.processLinkId;

    const bytes = await downloadAuto(registro.arquivoStorageKey);
    const { texto, paginas } = await extrairTextoDoArquivo(registro.arquivoNome, bytes);

    if (!texto.trim()) {
      throw new Error(
        "Não foi possível extrair texto do arquivo — provavelmente é um PDF digitalizado (imagem escaneada), que ainda não é suportado.",
      );
    }

    await updateProcessLinkImportStatus(importId, { status: "processando", paginasLidas: paginas });

    const prompt = buildImportVinculoPrompt(texto.slice(0, LIMITE_CARACTERES));
    const respostaTexto = await gerarJson(prompt, 60_000);
    const resultado = parseImportVinculoResult(respostaTexto);

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

    await updateProcessLink(
      processLinkId,
      {
        partes: valores.partes,
        juiz: valores.juiz,
        fase: valores.fase,
        valorCausa: valores.valorCausa,
        resumo: resultado.resumo,
      },
      actorId,
      { viaIa: true },
    );

    const firacNaoVazio = {
      f: resultado.firac.f.filter((p) => p.trim()),
      i: resultado.firac.i.filter((p) => p.trim()),
      r: resultado.firac.r.filter((p) => p.trim()),
      a: resultado.firac.a.filter((p) => p.trim()),
      c: resultado.firac.c.filter((p) => p.trim()),
    };
    await replaceProcessLinkFirac(processLinkId, firacNaoVazio, actorId, { viaIa: true });

    const argumentos = resultado.argumentos.filter((a) => a.titulo.trim());
    if (argumentos.length > 0) {
      await replaceProcessLinkArguments(processLinkId, argumentos, actorId, { viaIa: true });
    }

    await updateProcessLinkImportStatus(importId, {
      status: "concluido",
      camposFaltantes,
      respostaBruta: resultado,
    });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido ao processar a importação.";
    await updateProcessLinkImportStatus(importId, { status: "erro", erro: mensagem });
  }
}
