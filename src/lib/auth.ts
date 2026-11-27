import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureDb } from "./db";

export type RoleCode =
  | "sys_custodian"
  | "web_admin"
  | "fld_office"
  | "fld_coord"
  | "fld_member";

export const ALL_ROLE_CODES: RoleCode[] = [
  "sys_custodian",
  "web_admin",
  "fld_office",
  "fld_coord",
  "fld_member",
];

export const WEB_ADMIN_ROLES: RoleCode[] = ["sys_custodian", "web_admin"];

export const MOBILE_WORKER_ROLES: RoleCode[] = [
  "fld_office",
  "fld_coord",
  "fld_member",
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  sys_custodian: "Super Admin",
  web_admin: "Admin Web",
  fld_office: "Admin Kantor",
  fld_coord: "Admin Operasional",
  fld_member: "Operasional / Checker",
};

export const AUTH_COOKIE_NAME = "presensi_token";

export interface AuthUser {
  id: string;
  employee_code: string;
  full_name: string;
  role_code: RoleCode;
  is_first_login: boolean;
  is_active: boolean;
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "dev-secret-presensi-ganti-di-production-minimal-32-karakter";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signJwt(user: {
  id: string;
  employee_code: string;
  role_code: RoleCode;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    employee_code: user.employee_code,
    role_code: user.role_code,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyJwt(token: string): Promise<{
  sub: string;
  employee_code: string;
  role_code: RoleCode;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || !payload.role_code) return null;
    return {
      sub: String(payload.sub),
      employee_code: String(payload.employee_code || ""),
      role_code: payload.role_code as RoleCode,
    };
  } catch {
    return null;
  }
}

export async function extractToken(req?: NextRequest): Promise<string | null> {
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (cookieToken) return cookieToken;
  }
  try {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  const token = await extractToken(req);
  if (!token) return null;

  const claims = await verifyJwt(token);
  if (!claims) return null;

  const db = await ensureDb();
  const res = await db.execute({
    sql: `SELECT id, employee_code, full_name, role_code, is_first_login, is_active, deleted_at
          FROM users WHERE id = ? LIMIT 1`,
    args: [claims.sub],
  });

  const row = res.rows[0];
  if (!row || Number(row.is_active) !== 1 || row.deleted_at) return null;

  return {
    id: String(row.id),
    employee_code: String(row.employee_code),
    full_name: String(row.full_name),
    role_code: String(row.role_code) as RoleCode,
    is_first_login: Number(row.is_first_login) === 1,
    is_active: Number(row.is_active) === 1,
  };
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: RoleCode[],
  options?: { allowFirstLogin?: boolean }
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role_code)) {
    return {
      error: NextResponse.json(
        { error: "Anda tidak memiliki izin untuk mengakses fitur ini." },
        { status: 403 }
      ),
    };
  }

  if (user.is_first_login && !options?.allowFirstLogin) {
    return {
      error: NextResponse.json(
        {
          error: "Wajib membuat kata sandi baru sebelum menggunakan fitur ini.",
          code: "FIRST_LOGIN_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
