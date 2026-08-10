import "server-only";
import { chromium } from "playwright";
import type { DossierFull } from "@/lib/types/dossier";
import { buildDossierPdfHtml, buildHeaderTemplate, buildFooterTemplate } from "@/lib/pdf/template";

type PdfOptions = {
  format?: "A4";
  landscape?: boolean;
  margin: { top: string; bottom: string; left: string; right: string };
  headerTemplate?: string;
  footerTemplate?: string;
};

/**
 * Sem round-trip HTTP: o HTML final já sai pronto (dados já resolvidos) e vai
 * direto para page.setContent(). Espera `document.fonts.ready` antes de
 * imprimir — sem isso, a Archivo (carregada com `font-display: swap`) às
 * vezes ainda não terminou de trocar do fallback no momento do page.pdf(),
 * o que produz glifos com metria estranha (percebido nos "L").
 */
export async function renderHtmlToPdf(html: string, options: PdfOptions): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    return await page.pdf({
      format: options.format ?? "A4",
      landscape: options.landscape ?? false,
      margin: options.margin,
      displayHeaderFooter: Boolean(options.headerTemplate || options.footerTemplate),
      headerTemplate: options.headerTemplate ?? "<div></div>",
      footerTemplate: options.footerTemplate ?? "<div></div>",
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

export async function renderDossierPdf(dossier: DossierFull): Promise<Buffer> {
  return renderHtmlToPdf(buildDossierPdfHtml(dossier), {
    margin: { top: "0.9in", bottom: "0.85in", left: "0.7in", right: "0.7in" },
    headerTemplate: buildHeaderTemplate(dossier),
    footerTemplate: buildFooterTemplate(dossier),
  });
}

export async function renderCalendarPdf(html: string, landscape: boolean): Promise<Buffer> {
  return renderHtmlToPdf(html, {
    landscape,
    margin: { top: "0.6in", bottom: "0.6in", left: "0.6in", right: "0.6in" },
  });
}
