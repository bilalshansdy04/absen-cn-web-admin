import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ensureDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["sys_custodian"]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  let reason = "";
  try {
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    reason = (body.reason || "").trim();
  } catch {
    reason = "";
  }

  const db = await ensureDb();
  const res = await db.execute({
    sql: `SELECT id, user_id, attendance_date,
                 check_in_at, check_in_lat, check_in_lng, check_in_address, check_in_tg_file_id,
                 check_out_at, check_out_lat, check_out_lng, check_out_address, check_out_tg_file_id
          FROM attendance_logs WHERE id = ? LIMIT 1`,
    args: [id],
  });

  const row = res.rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "Log presensi tidak ditemukan." },
      { status: 404 }
    );
  }

  // Pindahkan ke deleted_attendance_logs lalu hapus dari attendance_logs
  // sehingga karyawan dianggap belum absen di tanggal tersebut dan bisa Check-In ulang.
  await db.batch(
    [
      {
        sql: `INSERT INTO deleted_attendance_logs (
                id, original_log_id, user_id, attendance_date,
                check_in_at, check_in_lat, check_in_lng, check_in_address, check_in_tg_file_id,
                check_out_at, check_out_lat, check_out_lng, check_out_address, check_out_tg_file_id,
                deleted_by, deleted_reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          String(row.id),
          String(row.user_id),
          String(row.attendance_date),
          row.check_in_at != null ? String(row.check_in_at) : null,
          row.check_in_lat != null ? Number(row.check_in_lat) : null,
          row.check_in_lng != null ? Number(row.check_in_lng) : null,
          row.check_in_address != null ? String(row.check_in_address) : null,
          row.check_in_tg_file_id != null ? String(row.check_in_tg_file_id) : null,
          row.check_out_at != null ? String(row.check_out_at) : null,
          row.check_out_lat != null ? Number(row.check_out_lat) : null,
          row.check_out_lng != null ? Number(row.check_out_lng) : null,
          row.check_out_address != null ? String(row.check_out_address) : null,
          row.check_out_tg_file_id != null ? String(row.check_out_tg_file_id) : null,
          auth.user.employee_code,
          reason || null,
        ],
      },
      {
        sql: `DELETE FROM attendance_logs WHERE id = ?`,
        args: [id],
      },
    ],
    "write"
  );

  return NextResponse.json({
    ok: true,
    message: "Log presensi dipindahkan ke Histori Terhapus.",
  });
}
