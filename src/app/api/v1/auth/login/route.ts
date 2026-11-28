import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import {
  AUTH_COOKIE_NAME,
  ROLE_LABELS,
  RoleCode,
  signJwt,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      employee_code?: string;
      password?: string;
      client?: "web" | "mobile";
    };

    const employeeCode = (body.employee_code || "").trim().toUpperCase();
    const password = body.password || "";

    if (!employeeCode || !password) {
      return NextResponse.json(
        { error: "ID Karyawan dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const db = await ensureDb();
    const res = await db.execute({
      sql: `SELECT id, employee_code, full_name, password_hash, role_code, is_first_login, is_active
            FROM users WHERE UPPER(employee_code) = ? LIMIT 1`,
      args: [employeeCode],
    });

    const row = res.rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "ID Karyawan atau kata sandi salah." },
        { status: 401 }
      );
    }

    if (Number(row.is_active) !== 1) {
      return NextResponse.json(
        { error: "Akun Anda telah dinonaktifkan. Hubungi koordinator." },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, String(row.password_hash));
    if (!valid) {
      return NextResponse.json(
        { error: "ID Karyawan atau kata sandi salah." },
        { status: 401 }
      );
    }

    const roleCode = String(row.role_code) as RoleCode;
    if (body.client === "web" && roleCode === "fld_member") {
      return NextResponse.json(
        { error: "Akun Field Member hanya dapat mengakses aplikasi mobile." },
        { status: 403 }
      );
    }

    const token = await signJwt({
      id: String(row.id),
      employee_code: String(row.employee_code),
      role_code: roleCode,
    });

    const userPayload = {
      id: String(row.id),
      employee_code: String(row.employee_code),
      full_name: String(row.full_name),
      role_code: roleCode,
      role_label: ROLE_LABELS[roleCode],
      is_first_login: Number(row.is_first_login) === 1,
    };

    const response = NextResponse.json({
      token,
      user: userPayload,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat masuk." },
      { status: 500 }
    );
  }
}
