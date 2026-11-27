import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { ALL_ROLE_CODES, hashPassword, requireRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ALL_ROLE_CODES, {
    allowFirstLogin: true,
  });
  if ("error" in auth) return auth.error;

  try {
    const body = (await req.json()) as { new_password?: string };
    const newPassword = body.new_password || "";

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasLetter || !hasNumber) {
      return NextResponse.json(
        {
          error:
            "Kata sandi baru minimal 8 karakter dan wajib kombinasi huruf serta angka.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const db = await ensureDb();
    await db.execute({
      sql: `UPDATE users SET password_hash = ?, is_first_login = 0 WHERE id = ?`,
      args: [passwordHash, auth.user.id],
    });

    return NextResponse.json({
      ok: true,
      message: "Kata sandi berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kata sandi." },
      { status: 500 }
    );
  }
}
