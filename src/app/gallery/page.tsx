import { AdminShell } from "@/components/AdminShell";
import { GalleryClient } from "@/components/GalleryClient";
import { requireAdminPageSession } from "@/lib/session";
import { getAttendanceDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await requireAdminPageSession();
  const today = getAttendanceDateString();

  return (
    <AdminShell user={user}>
      <GalleryClient defaultDate={today} />
    </AdminShell>
  );
}
