import "server-only";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

// pdfjs-dist (usado pelo pdf-parse) carrega seu "worker" resolvendo o caminho
// a partir do módulo que o chama — no output empacotado do Next.js (Turbopack)
// isso aponta para dentro de .next/server/chunks em vez do arquivo real em
// node_modules, e a extração falha com "Setting up fake worker failed". Fixa
// o caminho explicitamente, direto do node_modules na raiz do projeto/app.
PDFParse.setWorker(
  pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href,
);

export async function extrairTextoDoArquivo(
  arquivoNome: string,
  bytes: Buffer,
): Promise<{ texto: string; paginas: number | null }> {
  if (!arquivoNome.toLowerCase().endsWith(".pdf")) {
    return { texto: bytes.toString("utf-8"), paginas: null };
  }

  const parser = new PDFParse({ data: bytes });
  try {
    const resultado = await parser.getText();
    return { texto: resultado.text, paginas: resultado.total };
  } finally {
    await parser.destroy();
  }
}
