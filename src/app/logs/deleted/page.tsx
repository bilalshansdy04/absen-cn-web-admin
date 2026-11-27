import { AdminShell } from "@/components/AdminShell";
import { DeletedLogsClient } from "@/components/DeletedLogsClient";
import { requireAdminPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DeletedLogsPage() {
  const user = await requireAdminPageSession({ custodianOnly: true });

  return (
    <AdminShell user={user}>
      <DeletedLogsClient />
    </AdminShell>
  );
}
