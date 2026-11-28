import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getTelegramConfig, testTelegramConnection } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["sys_custodian"]);
  if ("error" in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      bot_token?: string;
      channel_id?: string;
    };

    const current = await getTelegramConfig();
    const botToken = (body.bot_token || "").trim() || current.botToken;
    const channelId = (body.channel_id || "").trim() || current.channelId;

    if (!botToken || !channelId) {
      return NextResponse.json(
        { error: "Bot Token dan Channel ID wajib diisi untuk uji koneksi." },
        { status: 400 }
      );
    }

    const result = await testTelegramConnection(botToken, channelId);
    return NextResponse.json({
      ok: true,
      ...result,
      message: `Terhubung ke bot @${result.botUsername} dan channel "${result.chatTitle}".`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Uji koneksi Telegram gagal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
