import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { ALL_ROLE_CODES, requireRole } from "@/lib/auth";
import {
  getAttendanceDateString,
  getWibDisplayDateTime,
  getWibIsoString,
} from "@/lib/time";
import { burnAttendanceWatermark } from "@/lib/watermark";
import { sendTelegramDocument } from "@/lib/telegram";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ALL_ROLE_CODES);
  if ("error" in auth) return auth.error;

  try {
    const formData = await req.formData();
    const photo = formData.get("photo");
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    const address = String(formData.get("address") || "").trim();

    if (!(photo instanceof File)) {
      return NextResponse.json(
        { error: "Foto presensi wajib dilampirkan." },
        { status: 400 }
      );
    }

    if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Ukuran foto tidak valid atau melebihi batas 4 MB." },
        { status: 413 }
      );
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Koordinat GPS tidak valid." },
        { status: 400 }
      );
    }

    const now = new Date();
    const todayDate = getAttendanceDateString(now);
    const checkOutIso = getWibIsoString(now);
    const displayTime = getWibDisplayDateTime(now);

    const db = await ensureDb();
    const existing = await db.execute({
      sql: `SELECT id, check_in_at, check_out_at FROM attendance_logs WHERE user_id = ? AND attendance_date = ? LIMIT 1`,
      args: [auth.user.id, todayDate],
    });

    const row = existing.rows[0];
    if (!row || !row.check_in_at) {
      return NextResponse.json(
        { error: "Anda belum melakukan Check-In hari ini." },
        { status: 400 }
      );
    }

    if (row.check_out_at) {
      return NextResponse.json(
        { error: "Anda sudah melakukan Check-Out hari ini." },
        { status: 409 }
      );
    }

    const rawBuffer = Buffer.from(await photo.arrayBuffer());
    const watermarked = await burnAttendanceWatermark({
      imageBuffer: rawBuffer,
      action: "CHECK-OUT",
      fullName: auth.user.full_name,
      employeeCode: auth.user.employee_code,
      displayTimeWib: displayTime,
      address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    });

    const filename = `OUT_${auth.user.employee_code}_${todayDate}.jpg`;
    const caption = `[CHECK-OUT] ${auth.user.full_name} (${auth.user.employee_code})\n${displayTime}\n${address || "-"} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    const { fileId } = await sendTelegramDocument(
      watermarked,
      filename,
      caption
    );

    await db.execute({
      sql: `UPDATE attendance_logs
            SET check_out_at = ?, check_out_lat = ?, check_out_lng = ?, check_out_address = ?, check_out_tg_file_id = ?
            WHERE id = ?`,
      args: [
        checkOutIso,
        lat,
        lng,
        address || null,
        fileId,
        String(row.id),
      ],
    });

    return NextResponse.json({
      ok: true,
      id: String(row.id),
      attendance_date: todayDate,
      check_out_at: checkOutIso,
      status: "COMPLETED",
    });
  } catch (error) {
    console.error("Check-out error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal memproses Check-Out.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
