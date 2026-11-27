import { AdminShell } from "@/components/AdminShell";
import { DashboardClient } from "@/components/DashboardClient";
import { requireAdminPageSession } from "@/lib/session";
import { getAttendanceDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAdminPageSession();
  const today = getAttendanceDateString();

  return (
    <AdminShell user={user}>
      <DashboardClient user={user} todayDate={today} />
    </AdminShell>
  );
}
