import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { hashPassword, requireRole, RoleCode } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord"]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  try {
    const body = (await req.json()) as {
      is_active?: boolean;
      employee_code?: string;
      full_name?: string;
      role_code?: RoleCode;
      new_password?: string;
    };

    const db = await ensureDb();
    const target = await db.execute({
      sql: `SELECT id, employee_code, full_name, role_code, deleted_at FROM users WHERE id = ? LIMIT 1`,
      args: [id],
    });

    const row = target.rows[0];
    if (!row || row.deleted_at) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const targetRole = String(row.role_code) as RoleCode;
    if (auth.user.role_code === "fld_coord" && targetRole !== "fld_member") {
      return NextResponse.json(
        {
          error:
            "Field Coordinator hanya dapat mengubah akun Field Member.",
        },
        { status: 403 }
      );
    }

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (typeof body.is_active === "boolean") {
      if (id === auth.user.id && !body.is_active) {
        return NextResponse.json(
          { error: "Anda tidak dapat menonaktifkan akun Anda sendiri." },
          { status: 400 }
        );
      }
      updates.push("is_active = ?");
      args.push(body.is_active ? 1 : 0);
    }

    if (typeof body.employee_code === "string") {
      const nextCode = body.employee_code.trim().toUpperCase();
      if (!nextCode) {
        return NextResponse.json(
          { error: "ID Karyawan tidak boleh kosong." },
          { status: 400 }
        );
      }
      const dup = await db.execute({
        sql: `SELECT id FROM users WHERE UPPER(employee_code) = ? AND id != ? LIMIT 1`,
        args: [nextCode, id],
      });
      if (dup.rows.length > 0) {
        return NextResponse.json(
          { error: `ID Karyawan ${nextCode} sudah digunakan.` },
          { status: 409 }
        );
      }
      updates.push("employee_code = ?");
      args.push(nextCode);
    }

    if (typeof body.full_name === "string") {
      const nextName = body.full_name.trim();
      if (!nextName) {
        return NextResponse.json(
          { error: "Nama Lengkap tidak boleh kosong." },
          { status: 400 }
        );
      }
      updates.push("full_name = ?");
      args.push(nextName);
    }

    if (body.role_code !== undefined) {
      if (!["sys_custodian", "fld_coord", "fld_member"].includes(body.role_code)) {
        return NextResponse.json(
          { error: "Role tidak valid." },
          { status: 400 }
        );
      }
      if (
        auth.user.role_code === "fld_coord" &&
        body.role_code !== "fld_member"
      ) {
        return NextResponse.json(
          {
            error:
              "Field Coordinator tidak dapat mengubah peran menjadi admin.",
          },
          { status: 403 }
        );
      }
      updates.push("role_code = ?");
      args.push(body.role_code);
    }

    if (typeof body.new_password === "string" && body.new_password.length > 0) {
      const pass = body.new_password;
      if (pass.length < 8 || !/[a-zA-Z]/.test(pass) || !/[0-9]/.test(pass)) {
        return NextResponse.json(
          {
            error:
              "Kata sandi baru minimal 8 karakter dan wajib kombinasi huruf serta angka.",
          },
          { status: 400 }
        );
      }
      const hash = await hashPassword(pass);
      updates.push("password_hash = ?");
      args.push(hash);
      updates.push("is_first_login = 0");
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan yang dikirim." },
        { status: 400 }
      );
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data akun." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord"]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "Anda tidak dapat menghapus akun Anda sendiri." },
      { status: 400 }
    );
  }

  const db = await ensureDb();
  const target = await db.execute({
    sql: `SELECT id, employee_code, role_code, deleted_at FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });

  const row = target.rows[0];
  if (!row || row.deleted_at) {
    return NextResponse.json(
      { error: "Pengguna tidak ditemukan." },
      { status: 404 }
    );
  }

  const targetRole = String(row.role_code) as RoleCode;
  if (auth.user.role_code === "fld_coord" && targetRole !== "fld_member") {
    return NextResponse.json(
      {
        error:
          "Field Coordinator hanya dapat menghapus akun Field Member.",
      },
      { status: 403 }
    );
  }

  await db.execute({
    sql: `UPDATE users SET is_active = 0, deleted_at = datetime('now') WHERE id = ?`,
    args: [id],
  });

  return NextResponse.json({
    ok: true,
    message: `Akun ${String(row.employee_code)} berhasil dihapus (soft delete).`,
  });
}
