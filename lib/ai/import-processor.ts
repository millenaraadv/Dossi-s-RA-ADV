import "server-only";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";
import { downloadAuto } from "@/lib/supabase/storage";
import { getImport, updateImportStatus } from "@/lib/db/queries/imports";
import { createDossier, updateDossierGeneral, replaceTimeline, replaceFirac } from "@/lib/db/queries/dossiers";
import { buildImportPrompt } from "@/lib/ai/prompts/import-autos";
import { gerarJson } from "@/lib/ai/client";
import { parseImportResult, type ImportResult } from "@/lib/ai/parse";

// pdfjs-dist (usado pelo pdf-parse) carrega seu "worker" resolvendo o caminho
// a partir do módulo que o chama — no output empacotado do Next.js (Turbopack)
// isso aponta para dentro de .next/server/chunks em vez do arquivo real em
// node_modules, e a extração falha com "Setting up fake worker failed". Fixa
// o caminho explicitamente, direto do node_modules na raiz do projeto/app.
PDFParse.setWorker(
  pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href,
);

const NAO_LOCALIZADO = "não localizado nos autos";

// Rótulos em português para o aviso "a IA não localizou nos autos: X, Y"
// (README 4.1, item 5).
const ROTULOS = {
  cliente: "Cliente",
  caso: "Caso",
  numeroProcesso: "Nº do processo",
  fase: "Fase",
  orgao: "Comarca/tribunal",
  juiz: "Magistrado",
  partes: "Partes",
  advogadoContrario: "Advogado contrário",
  valorCausa: "Valor da causa",
} as const satisfies Partial<Record<keyof ImportResult, string>>;

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
    let texto: string;
    let paginas: number | null = null;

    if (registro.arquivoNome.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: bytes });
      try {
        const resultado = await parser.getText();
        texto = resultado.text;
        paginas = resultado.total;
      } finally {
        await parser.destroy();
      }
    } else {
      texto = bytes.toString("utf-8");
    }

    if (!texto.trim()) {
      throw new Error(
        "Não foi possível extrair texto do arquivo — provavelmente é um PDF digitalizado (imagem escaneada), que ainda não é suportado.",
      );
    }

    await updateImportStatus(importId, { status: "processando", paginasLidas: paginas });

    const prompt = buildImportPrompt(texto.slice(0, LIMITE_CARACTERES));
    const respostaTexto = await gerarJson(prompt);
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
    );

    const timeline = resultado.timeline.filter((t) => t.dataTexto.trim() && t.ato.trim());
    if (timeline.length > 0) {
      await replaceTimeline(dossierId, timeline, actorId);
    }

    const firacNaoVazio = {
      f: resultado.firac.f.filter((p) => p.trim()),
      i: resultado.firac.i.filter((p) => p.trim()),
      r: resultado.firac.r.filter((p) => p.trim()),
      a: resultado.firac.a.filter((p) => p.trim()),
      c: resultado.firac.c.filter((p) => p.trim()),
    };
    await replaceFirac(dossierId, firacNaoVazio, actorId);

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
