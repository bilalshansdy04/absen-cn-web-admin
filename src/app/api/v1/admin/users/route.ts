import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ensureDb, getDefaultPassword } from "@/lib/db";
import {
  ALL_ROLE_CODES,
  hashPassword,
  MOBILE_WORKER_ROLES,
  requireRole,
  ROLE_LABELS,
  RoleCode,
  WEB_ADMIN_ROLES,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, WEB_ADMIN_ROLES);
  if ("error" in auth) return auth.error;

  const db = await ensureDb();
  const search = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  let sql = `SELECT id, employee_code, full_name, role_code, is_first_login, is_active, created_by, created_at
             FROM users
             WHERE (deleted_at IS NULL OR deleted_at = '')`;
  const args: string[] = [];

  if (search) {
    sql += ` AND (LOWER(employee_code) LIKE ? OR LOWER(full_name) LIKE ?)`;
    args.push(`%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY created_at DESC LIMIT 200`;

  const res = await db.execute({ sql, args });
  const users = res.rows.map((r) => {
    const roleCode = String(r.role_code) as RoleCode;
    return {
      id: String(r.id),
      employee_code: String(r.employee_code),
      full_name: String(r.full_name),
      role_code: roleCode,
      role_label: ROLE_LABELS[roleCode],
      is_first_login: Number(r.is_first_login) === 1,
      is_active: Number(r.is_active) === 1,
      created_by: r.created_by ? String(r.created_by) : null,
      created_at: String(r.created_at),
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, WEB_ADMIN_ROLES);
  if ("error" in auth) return auth.error;

  try {
    const body = (await req.json()) as {
      employee_code?: string;
      full_name?: string;
      role_code?: RoleCode;
    };

    const employeeCode = (body.employee_code || "").trim().toUpperCase();
    const fullName = (body.full_name || "").trim();
    const requestedRole = body.role_code || "fld_member";

    if (!employeeCode || !fullName) {
      return NextResponse.json(
        { error: "ID Karyawan dan Nama Lengkap wajib diisi." },
        { status: 400 }
      );
    }

    if (!ALL_ROLE_CODES.includes(requestedRole)) {
      return NextResponse.json(
        { error: "Role tidak valid." },
        { status: 400 }
      );
    }

    // sys_custodian -> semua 5 role; web_admin -> hanya 3 role mobile worker
    if (
      auth.user.role_code === "web_admin" &&
      !MOBILE_WORKER_ROLES.includes(requestedRole)
    ) {
      return NextResponse.json(
        {
          error:
            "Admin Web hanya dapat membuat akun lapangan (Admin Kantor, Admin Operasional, Checker).",
        },
        { status: 403 }
      );
    }

    const db = await ensureDb();
    const dup = await db.execute({
      sql: `SELECT id FROM users WHERE UPPER(employee_code) = ? LIMIT 1`,
      args: [employeeCode],
    });
    if (dup.rows.length > 0) {
      return NextResponse.json(
        { error: `ID Karyawan ${employeeCode} sudah terdaftar.` },
        { status: 409 }
      );
    }

    const defaultPassword = getDefaultPassword(employeeCode);
    const passwordHash = await hashPassword(defaultPassword);
    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO users (id, employee_code, full_name, password_hash, role_code, is_first_login, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      args: [
        id,
        employeeCode,
        fullName,
        passwordHash,
        requestedRole,
        auth.user.employee_code,
      ],
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id,
          employee_code: employeeCode,
          full_name: fullName,
          role_code: requestedRole,
          role_label: ROLE_LABELS[requestedRole],
          is_first_login: true,
          is_active: true,
        },
        default_password: defaultPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Gagal membuat akun baru." },
      { status: 500 }
    );
  }
}
