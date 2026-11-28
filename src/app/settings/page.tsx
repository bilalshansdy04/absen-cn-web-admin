import { AdminShell } from "@/components/AdminShell";
import { SettingsClient } from "@/components/SettingsClient";
import { requireAdminPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAdminPageSession({ custodianOnly: true });

  return (
    <AdminShell user={user}>
      <SettingsClient />
    </AdminShell>
  );
}
