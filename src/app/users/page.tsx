import { AdminShell } from "@/components/AdminShell";
import { UsersClient } from "@/components/UsersClient";
import { requireAdminPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireAdminPageSession();

  return (
    <AdminShell user={user}>
      <UsersClient currentUserRole={user.role_code} />
    </AdminShell>
  );
}
