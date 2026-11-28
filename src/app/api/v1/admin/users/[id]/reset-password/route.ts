import { NextRequest, NextResponse } from "next/server";
import { ensureDb, getDefaultPassword } from "@/lib/db";
import { hashPassword, requireRole, RoleCode } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord"]);
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
  if (auth.user.role_code === "fld_coord" && targetRole !== "fld_member") {
    return NextResponse.json(
      {
        error:
          "Field Coordinator hanya dapat mereset kata sandi Field Member.",
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
