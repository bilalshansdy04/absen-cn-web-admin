import { NextRequest, NextResponse } from "next/server";
import { ensureDb, getDefaultPassword } from "@/lib/db";
import {
  hashPassword,
  MOBILE_WORKER_ROLES,
  requireRole,
  RoleCode,
  WEB_ADMIN_ROLES,
} from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, WEB_ADMIN_ROLES);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const db = await ensureDb();

  const target = await db.execute({
    sql: `SELECT id, employee_code, role_code FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });

  const row = target.rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "Pengguna tidak ditemukan." },
      { status: 404 }
    );
  }

  const targetRole = String(row.role_code) as RoleCode;
  if (
    auth.user.role_code === "web_admin" &&
    !MOBILE_WORKER_ROLES.includes(targetRole)
  ) {
    return NextResponse.json(
      {
        error:
          "Admin Web hanya dapat mereset kata sandi akun lapangan.",
      },
      { status: 403 }
    );
  }

  const employeeCode = String(row.employee_code);
  const defaultPassword = getDefaultPassword(employeeCode);
  const passwordHash = await hashPassword(defaultPassword);

  await db.execute({
    sql: `UPDATE users SET password_hash = ?, is_first_login = 1 WHERE id = ?`,
    args: [passwordHash, id],
  });

  return NextResponse.json({
    ok: true,
    default_password: defaultPassword,
    message: `Kata sandi ${employeeCode} direset ke bawaan.`,
  });
}
