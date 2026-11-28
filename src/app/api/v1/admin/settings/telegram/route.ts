import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getTelegramConfig, maskToken } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["sys_custodian"]);
  if ("error" in auth) return auth.error;

  const config = await getTelegramConfig();
  return NextResponse.json({
    is_configured: Boolean(config.botToken && config.channelId),
    bot_token_masked: maskToken(config.botToken),
    channel_id: config.channelId || "",
    source: config.source,
    updated_at: config.updatedAt || null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(req, ["sys_custodian"]);
  if ("error" in auth) return auth.error;

  try {
    const body = (await req.json()) as {
      bot_token?: string;
      channel_id?: string;
    };

    const incomingToken = (body.bot_token || "").trim();
    const channelId = (body.channel_id || "").trim();

    if (!channelId) {
      return NextResponse.json(
        { error: "Telegram Channel ID wajib diisi (contoh: -1001234567890)." },
        { status: 400 }
      );
    }

    const current = await getTelegramConfig();
    const finalToken = incomingToken || current.botToken;

    if (!finalToken) {
      return NextResponse.json(
        { error: "Telegram Bot Token wajib diisi." },
        { status: 400 }
      );
    }

    const db = await ensureDb();
    await db.batch(
      [
        {
          sql: `INSERT INTO app_settings (key, value, updated_by, updated_at)
                VALUES ('telegram_bot_token', ?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET
                  value = excluded.value,
                  updated_by = excluded.updated_by,
                  updated_at = excluded.updated_at`,
          args: [finalToken, auth.user.employee_code],
        },
        {
          sql: `INSERT INTO app_settings (key, value, updated_by, updated_at)
                VALUES ('telegram_channel_id', ?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET
                  value = excluded.value,
                  updated_by = excluded.updated_by,
                  updated_at = excluded.updated_at`,
          args: [channelId, auth.user.employee_code],
        },
      ],
      "write"
    );

    return NextResponse.json({
      ok: true,
      is_configured: true,
      bot_token_masked: maskToken(finalToken),
      channel_id: channelId,
      source: "database",
      message: "Konfigurasi Telegram Bot & Channel berhasil disimpan.",
    });
  } catch (error) {
    console.error("Save Telegram settings error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan konfigurasi Telegram." },
      { status: 500 }
    );
  }
}
