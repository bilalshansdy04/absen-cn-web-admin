import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  if (user.is_first_login) {
    redirect("/change-password");
  }
  if (user.role_code === "fld_member") {
    redirect("/login");
  }
  redirect("/logs");
}
