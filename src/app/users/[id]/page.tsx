import { AdminShell } from "@/components/AdminShell";
import { UserHistoryClient } from "@/components/UserHistoryClient";
import { requireAdminPageSession } from "@/lib/session";
import { getAttendanceDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function UserHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdminPageSession();
  const { id } = await params;
  const today = getAttendanceDateString();
  const thirtyDaysAgo = getAttendanceDateString(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  return (
    <AdminShell user={user}>
      <UserHistoryClient
        userId={id}
        defaultStartDate={thirtyDaysAgo}
        defaultEndDate={today}
      />
    </AdminShell>
  );
}
