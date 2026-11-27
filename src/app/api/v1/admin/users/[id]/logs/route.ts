import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole, ROLE_LABELS, RoleCode, WEB_ADMIN_ROLES } from "@/lib/auth";
import { getAttendanceDateString } from "@/lib/time";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, WEB_ADMIN_ROLES);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const today = getAttendanceDateString();
  const thirtyDaysAgo = getAttendanceDateString(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const startDate = (
    req.nextUrl.searchParams.get("start_date") || thirtyDaysAgo
  ).trim();
  const endDate = (req.nextUrl.searchParams.get("end_date") || today).trim();

  const db = await ensureDb();
  const userRes = await db.execute({
    sql: `SELECT id, employee_code, full_name, role_code, is_active, deleted_at, created_at
          FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });

  const u = userRes.rows[0];
  if (!u) {
    return NextResponse.json(
      { error: "Akun tidak ditemukan." },
      { status: 404 }
    );
  }

  const logsRes = await db.execute({
    sql: `SELECT id, attendance_date,
                 check_in_at, check_in_lat, check_in_lng, check_in_address, check_in_tg_file_id,
                 check_out_at, check_out_lat, check_out_lng, check_out_address, check_out_tg_file_id
          FROM attendance_logs
          WHERE user_id = ? AND attendance_date >= ? AND attendance_date <= ?
          ORDER BY attendance_date DESC
          LIMIT 100`,
    args: [id, startDate, endDate],
  });

  let totalDaysPresent = 0;
  let totalCompletedDays = 0;
  let totalMinutes = 0;

  const logs = logsRes.rows.map((r) => {
    const inAt = r.check_in_at ? String(r.check_in_at) : null;
    const outAt = r.check_out_at ? String(r.check_out_at) : null;
    if (inAt) totalDaysPresent++;
    let durationMinutes: number | null = null;
    if (inAt && outAt) {
      totalCompletedDays++;
      const diffMs = new Date(outAt).getTime() - new Date(inAt).getTime();
      if (Number.isFinite(diffMs) && diffMs >= 0) {
        durationMinutes = Math.round(diffMs / 60000);
        totalMinutes += durationMinutes;
      }
    }

    return {
      id: String(r.id),
      attendance_date: String(r.attendance_date),
      check_in_at: inAt,
      check_in_lat: r.check_in_lat != null ? Number(r.check_in_lat) : null,
      check_in_lng: r.check_in_lng != null ? Number(r.check_in_lng) : null,
      check_in_address: r.check_in_address ? String(r.check_in_address) : null,
      check_in_tg_file_id: r.check_in_tg_file_id
        ? String(r.check_in_tg_file_id)
        : null,
      check_out_at: outAt,
      check_out_lat: r.check_out_lat != null ? Number(r.check_out_lat) : null,
      check_out_lng: r.check_out_lng != null ? Number(r.check_out_lng) : null,
      check_out_address: r.check_out_address
        ? String(r.check_out_address)
        : null,
      check_out_tg_file_id: r.check_out_tg_file_id
        ? String(r.check_out_tg_file_id)
        : null,
      duration_minutes: durationMinutes,
    };
  });

  const roleCode = String(u.role_code) as RoleCode;
  return NextResponse.json({
    user: {
      id: String(u.id),
      employee_code: String(u.employee_code),
      full_name: String(u.full_name),
      role_code: roleCode,
      role_label: ROLE_LABELS[roleCode],
      is_active: Number(u.is_active) === 1,
      is_deleted: Boolean(u.deleted_at),
    },
    summary: {
      total_days_present: totalDaysPresent,
      total_completed_days: totalCompletedDays,
      total_work_minutes: totalMinutes,
    },
    logs,
  });
}
