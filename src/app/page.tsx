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
  if (!["sys_custodian", "web_admin"].includes(user.role_code)) {
    redirect("/login");
  }
  redirect("/dashboard");
}
