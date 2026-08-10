import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canReadDossiers, assertPermission } from "@/lib/auth/permissions";
import { getMonthGrid, getWeekRange } from "@/lib/calendar";
import { getCalendarProjection } from "@/lib/db/queries/calendar";
import { listActiveUsers } from "@/lib/db/queries/users";
import { buildMonthCalendarPdfHtml, buildWeekCalendarPdfHtml } from "@/lib/pdf/calendar-template";
import { renderCalendarPdf } from "@/lib/pdf/render";
import { handleRouteError } from "@/lib/api-helpers";
import { hojeIso } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertPermission(canReadDossiers(user.papel));

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "semana" ? "semana" : "mes";
    const ref = url.searchParams.get("ref") || hojeIso();
    const responsavel = url.searchParams.get("responsavel") ?? undefined;

    const membros = await listActiveUsers();

    let html: string;
    let nomeArquivo: string;

    if (mode === "semana") {
      const range = getWeekRange(ref);
      const { abertos, realizadas } = await getCalendarProjection({
        start: range.start,
        end: range.end,
        responsavelId: responsavel,
      });
      html = buildWeekCalendarPdfHtml(range, abertos, realizadas, membros);
      nomeArquivo = `Calendario - ${range.label.replace(/\//g, ".")}.pdf`;
    } else {
      const grid = getMonthGrid(ref);
      const { abertos } = await getCalendarProjection({
        start: grid.gridStart,
        end: grid.gridEnd,
        responsavelId: responsavel,
      });
      html = buildMonthCalendarPdfHtml(grid, abertos, membros);
      nomeArquivo = `Calendario - ${grid.label}.pdf`;
    }

    const pdf = await renderCalendarPdf(html, mode === "mes");

    return new NextResponse(new Blob([Uint8Array.from(pdf)]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
