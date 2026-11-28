import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole, RoleCode } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord"]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "Anda tidak dapat menonaktifkan akun Anda sendiri." },
      { status: 400 }
    );
  }

  try {
    const body = (await req.json()) as { is_active?: boolean };
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { error: "Parameter is_active wajib berupa boolean." },
        { status: 400 }
      );
    }

    const db = await ensureDb();
    const target = await db.execute({
      sql: `SELECT id, role_code FROM users WHERE id = ? LIMIT 1`,
      args: [id],
    });

    if (!target.rows[0]) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const targetRole = String(target.rows[0].role_code) as RoleCode;
    if (auth.user.role_code === "fld_coord" && targetRole !== "fld_member") {
      return NextResponse.json(
        {
          error:
            "Field Coordinator hanya dapat mengubah status akun Field Member.",
        },
        { status: 403 }
      );
    }

    await db.execute({
      sql: `UPDATE users SET is_active = ? WHERE id = ?`,
      args: [body.is_active ? 1 : 0, id],
    });

    return NextResponse.json({ ok: true, is_active: body.is_active });
  } catch (error) {
    console.error("Toggle user error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status akun." },
      { status: 500 }
    );
  }
}
