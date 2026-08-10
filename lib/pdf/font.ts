import "server-only";
import fs from "node:fs";
import path from "node:path";

let cache: string | null = null;

function archivoBase64(): string {
  if (cache) return cache;
  const p = path.join(process.cwd(), "lib/pdf/fonts/archivo-variable.woff2");
  cache = fs.readFileSync(p).toString("base64");
  return cache;
}

/**
 * Fonte embutida como data URI — nada de rede, nada de `font-display: swap`
 * correndo contra o `page.pdf()`. É a mesma fonte variável que o Google Fonts
 * serve para os pesos 300/400/600 do Archivo (um arquivo só, pesos via eixo
 * variável), só que já dentro do HTML antes do primeiro parse.
 */
export function archivoFontFaceCss(): string {
  const base64 = archivoBase64();
  const pesos = [300, 400, 600];
  return pesos
    .map(
      (peso) => `
  @font-face {
    font-family: 'Archivo';
    font-style: normal;
    font-weight: ${peso};
    font-display: block;
    src: url(data:font/woff2;base64,${base64}) format('woff2');
  }`,
    )
    .join("\n");
}
