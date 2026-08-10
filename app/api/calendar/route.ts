import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canReadDossiers, assertPermission } from "@/lib/auth/permissions";
import { getMonthGrid, getWeekRange } from "@/lib/calendar";
import { getCalendarProjection } from "@/lib/db/queries/calendar";
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

    const range = mode === "semana" ? getWeekRange(ref) : getMonthGrid(ref);
    const start = "gridStart" in range ? range.gridStart : range.start;
    const end = "gridEnd" in range ? range.gridEnd : range.end;

    const projecao = await getCalendarProjection({ start, end, responsavelId: responsavel });

    return NextResponse.json({ ...projecao, range });
  } catch (err) {
    return handleRouteError(err);
  }
}
