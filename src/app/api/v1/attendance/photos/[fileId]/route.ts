import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fetchTelegramFile } from "@/lib/telegram";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const auth = await requireRole(req, [
    "sys_custodian",
    "fld_coord",
    "fld_member",
  ]);
  if ("error" in auth) return auth.error;

  const { fileId } = await context.params;
  if (!fileId) {
    return NextResponse.json({ error: "fileId wajib diisi." }, { status: 400 });
  }

  // Pastikan member hanya dapat melihat foto presensi miliknya sendiri
  if (auth.user.role_code === "fld_member") {
    const db = await ensureDb();
    const owned = await db.execute({
      sql: `SELECT id FROM attendance_logs
            WHERE user_id = ? AND (check_in_tg_file_id = ? OR check_out_tg_file_id = ?)
            LIMIT 1`,
      args: [auth.user.id, fileId, fileId],
    });
    if (owned.rows.length === 0) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke foto ini." },
        { status: 403 }
      );
    }
  }

  try {
    const { buffer, contentType } = await fetchTelegramFile(fileId);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat foto.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
