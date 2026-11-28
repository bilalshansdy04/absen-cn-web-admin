import { AdminShell } from "@/components/AdminShell";
import { LogsClient } from "@/components/LogsClient";
import { requireAdminPageSession } from "@/lib/session";
import { getAttendanceDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const user = await requireAdminPageSession();
  const today = getAttendanceDateString();

  return (
    <AdminShell user={user}>
      <LogsClient defaultDate={today} />
    </AdminShell>
  );
}
