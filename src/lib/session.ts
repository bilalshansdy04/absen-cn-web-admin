import { redirect } from "next/navigation";
import { getAuthUser, ROLE_LABELS } from "./auth";
import type { AdminSessionUser } from "@/components/AdminShell";

export async function requireAdminPageSession(options?: {
  custodianOnly?: boolean;
}): Promise<AdminSessionUser> {
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
  if (options?.custodianOnly && user.role_code !== "sys_custodian") {
    redirect("/logs");
  }

  return {
    id: user.id,
    employee_code: user.employee_code,
    full_name: user.full_name,
    role_code: user.role_code,
    role_label: ROLE_LABELS[user.role_code],
  };
}
