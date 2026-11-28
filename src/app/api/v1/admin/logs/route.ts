import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getAttendanceDateString } from "@/lib/time";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord"]);
  if ("error" in auth) return auth.error;

  const today = getAttendanceDateString();
  const startDate = (
    req.nextUrl.searchParams.get("start_date") || today
  ).trim();
  const endDate = (req.nextUrl.searchParams.get("end_date") || today).trim();
  const search = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50"))
  );
  const offset = (page - 1) * pageSize;

  const db = await ensureDb();

  // Today's summary metrics
  const [activeMembersRes, todayStatsRes] = await Promise.all([
    db.execute(
      `SELECT COUNT(*) as total FROM users WHERE role_code = 'fld_member' AND is_active = 1`
    ),
    db.execute({
      sql: `SELECT
              COUNT(CASE WHEN check_in_at IS NOT NULL THEN 1 END) as checked_in,
              COUNT(CASE WHEN check_out_at IS NOT NULL THEN 1 END) as checked_out
            FROM attendance_logs
            WHERE attendance_date = ?`,
      args: [today],
    }),
  ]);

  const totalActiveMembers = Number(activeMembersRes.rows[0]?.total ?? 0);
  const checkedInToday = Number(todayStatsRes.rows[0]?.checked_in ?? 0);
  const checkedOutToday = Number(todayStatsRes.rows[0]?.checked_out ?? 0);
  const notCheckedInToday = Math.max(0, totalActiveMembers - checkedInToday);

  // Filtered logs with mandatory date range + max 50 pagination
  const whereClauses = ["a.attendance_date >= ?", "a.attendance_date <= ?"];
  const args: (string | number)[] = [startDate, endDate];

  if (search) {
    whereClauses.push(
      "(LOWER(u.full_name) LIKE ? OR LOWER(u.employee_code) LIKE ?)"
    );
    args.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.join(" AND ");

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as total
          FROM attendance_logs a
          JOIN users u ON u.id = a.user_id
          WHERE ${whereSql}`,
    args,
  });
  const totalRows = Number(countRes.rows[0]?.total ?? 0);

  const logsRes = await db.execute({
    sql: `SELECT
            a.id, a.user_id, a.attendance_date,
            a.check_in_at, a.check_in_lat, a.check_in_lng, a.check_in_address, a.check_in_tg_file_id,
            a.check_out_at, a.check_out_lat, a.check_out_lng, a.check_out_address, a.check_out_tg_file_id,
            u.employee_code, u.full_name, u.role_code
          FROM attendance_logs a
          JOIN users u ON u.id = a.user_id
          WHERE ${whereSql}
          ORDER BY a.attendance_date DESC, a.check_in_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset],
  });

  const logs = logsRes.rows.map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    employee_code: String(r.employee_code),
    full_name: String(r.full_name),
    attendance_date: String(r.attendance_date),
    check_in_at: r.check_in_at ? String(r.check_in_at) : null,
    check_in_lat: r.check_in_lat != null ? Number(r.check_in_lat) : null,
    check_in_lng: r.check_in_lng != null ? Number(r.check_in_lng) : null,
    check_in_address: r.check_in_address ? String(r.check_in_address) : null,
    check_in_tg_file_id: r.check_in_tg_file_id
      ? String(r.check_in_tg_file_id)
      : null,
    check_out_at: r.check_out_at ? String(r.check_out_at) : null,
    check_out_lat: r.check_out_lat != null ? Number(r.check_out_lat) : null,
    check_out_lng: r.check_out_lng != null ? Number(r.check_out_lng) : null,
    check_out_address: r.check_out_address ? String(r.check_out_address) : null,
    check_out_tg_file_id: r.check_out_tg_file_id
      ? String(r.check_out_tg_file_id)
      : null,
  }));

  return NextResponse.json({
    today,
    metrics: {
      total_active_members: totalActiveMembers,
      checked_in_today: checkedInToday,
      not_checked_in_today: notCheckedInToday,
      checked_out_today: checkedOutToday,
    },
    pagination: {
      page,
      page_size: pageSize,
      total_rows: totalRows,
      total_pages: Math.max(1, Math.ceil(totalRows / pageSize)),
    },
    logs,
  });
}
