import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getAttendanceDateString, getWibIsoString } from "@/lib/time";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord", "fld_member"]);
  if ("error" in auth) return auth.error;

  const limitParam = Number(req.nextUrl.searchParams.get("days") || "30");
  const limit = Math.min(Math.max(limitParam, 1), 30);

  const now = new Date();
  const todayDate = getAttendanceDateString(now);
  const db = await ensureDb();

  const res = await db.execute({
    sql: `SELECT id, attendance_date, check_in_at, check_in_lat, check_in_lng, check_in_address, check_in_tg_file_id,
                 check_out_at, check_out_lat, check_out_lng, check_out_address, check_out_tg_file_id
          FROM attendance_logs
          WHERE user_id = ?
          ORDER BY attendance_date DESC
          LIMIT ?`,
    args: [auth.user.id, limit],
  });

  const history = res.rows.map((r) => ({
    id: String(r.id),
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

  const todayLog = history.find((h) => h.attendance_date === todayDate) || null;
  let status: "NOT_CHECKED_IN" | "CHECKED_IN" | "COMPLETED" = "NOT_CHECKED_IN";
  if (todayLog?.check_in_at && todayLog?.check_out_at) {
    status = "COMPLETED";
  } else if (todayLog?.check_in_at) {
    status = "CHECKED_IN";
  }

  return NextResponse.json({
    server_time_wib: getWibIsoString(now),
    today_date: todayDate,
    status,
    today_log: todayLog,
    history,
  });
}
