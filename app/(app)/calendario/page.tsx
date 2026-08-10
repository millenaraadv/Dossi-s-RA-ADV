import { requireUser } from "@/lib/auth/session";
import { getMonthGrid } from "@/lib/calendar";
import { getCalendarProjection } from "@/lib/db/queries/calendar";
import { listActiveUsers } from "@/lib/db/queries/users";
import { hojeIso } from "@/lib/dates";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarioPage() {
  await requireUser();

  const ref = hojeIso();
  const grid = getMonthGrid(ref);
  const [projecao, membros] = await Promise.all([
    getCalendarProjection({ start: grid.gridStart, end: grid.gridEnd }),
    listActiveUsers(),
  ]);

  return (
    <CalendarView
      dadosIniciais={{ ...projecao, range: grid }}
      refInicial={ref}
      membros={membros}
    />
  );
}
