import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["sys_custodian"]);
  if ("error" in auth) return auth.error;

  const search = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50"))
  );
  const offset = (page - 1) * pageSize;

  const db = await ensureDb();
  const whereClauses: string[] = [];
  const args: (string | number)[] = [];

  if (search) {
    whereClauses.push(
      "(LOWER(u.full_name) LIKE ? OR LOWER(u.employee_code) LIKE ?)"
    );
    args.push(`%${search}%`, `%${search}%`);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const res = await db.execute({
    sql: `SELECT
            d.id, d.original_log_id, d.user_id, d.attendance_date,
            d.check_in_at, d.check_in_address, d.check_in_tg_file_id,
            d.check_out_at, d.check_out_address, d.check_out_tg_file_id,
            d.deleted_by, d.deleted_reason, d.deleted_at,
            u.employee_code, u.full_name
          FROM deleted_attendance_logs d
          JOIN users u ON u.id = d.user_id
          ${whereSql}
          ORDER BY d.deleted_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset],
  });

  const logs = res.rows.map((r) => ({
    id: String(r.id),
    original_log_id: String(r.original_log_id),
    user_id: String(r.user_id),
    employee_code: String(r.employee_code),
    full_name: String(r.full_name),
    attendance_date: String(r.attendance_date),
    check_in_at: r.check_in_at ? String(r.check_in_at) : null,
    check_in_address: r.check_in_address ? String(r.check_in_address) : null,
    check_in_tg_file_id: r.check_in_tg_file_id
      ? String(r.check_in_tg_file_id)
      : null,
    check_out_at: r.check_out_at ? String(r.check_out_at) : null,
    check_out_address: r.check_out_address ? String(r.check_out_address) : null,
    check_out_tg_file_id: r.check_out_tg_file_id
      ? String(r.check_out_tg_file_id)
      : null,
    deleted_by: String(r.deleted_by),
    deleted_reason: r.deleted_reason ? String(r.deleted_reason) : null,
    deleted_at: String(r.deleted_at),
  }));

  return NextResponse.json({ logs });
}
