import { requireUser } from "@/lib/auth/session";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <Topbar papel={user.papel} />
      {children}
    </>
  );
}
