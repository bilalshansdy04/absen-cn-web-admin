import { ensureDb } from "./db";

export interface TelegramConfig {
  botToken: string;
  channelId: string;
  source: "database" | "env" | "unconfigured";
  updatedAt?: string | null;
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}••••••${token.slice(-6)}`;
}

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const db = await ensureDb();
  const res = await db.execute(
    "SELECT key, value, updated_at FROM app_settings WHERE key IN ('telegram_bot_token', 'telegram_channel_id')"
  );

  let dbToken = "";
  let dbChannelId = "";
  let updatedAt: string | null = null;

  for (const row of res.rows) {
    const k = String(row.key);
    const v = String(row.value || "");
    if (k === "telegram_bot_token") {
      dbToken = v;
      updatedAt = row.updated_at ? String(row.updated_at) : updatedAt;
    }
    if (k === "telegram_channel_id") {
      dbChannelId = v;
      updatedAt = row.updated_at ? String(row.updated_at) : updatedAt;
    }
  }

  if (dbToken && dbChannelId) {
    return {
      botToken: dbToken,
      channelId: dbChannelId,
      source: "database",
      updatedAt,
    };
  }

  const envToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const envChannel = (process.env.TELEGRAM_CHANNEL_ID || "").trim();

  if (envToken && envChannel) {
    return {
      botToken: envToken,
      channelId: envChannel,
      source: "env",
      updatedAt: null,
    };
  }

  return {
    botToken: dbToken || envToken,
    channelId: dbChannelId || envChannel,
    source: "unconfigured",
    updatedAt,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendTelegramDocument(
  fileBuffer: Buffer,
  filename: string,
  caption: string
): Promise<{ fileId: string }> {
  const config = await getTelegramConfig();
  if (!config.botToken || !config.channelId) {
    throw new Error(
      "Konfigurasi Telegram Bot Token atau Channel ID belum diatur oleh System Custodian."
    );
  }

  const url = `https://api.telegram.org/bot${config.botToken}/sendDocument`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const form = new FormData();
    form.append("chat_id", config.channelId);
    form.append("caption", caption);
    const uint8 = new Uint8Array(fileBuffer);
    const blob = new Blob([uint8], { type: "image/jpeg" });
    form.append("document", blob, filename);

    const response = await fetch(url, {
      method: "POST",
      body: form,
    });

    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      parameters?: { retry_after?: number };
      result?: { document?: { file_id?: string } };
    } | null;

    if (response.status === 429 && attempt < maxAttempts) {
      const retryAfterSec = Math.min(
        Number(data?.parameters?.retry_after ?? 2),
        4
      );
      await sleep(retryAfterSec * 1000);
      continue;
    }

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.description ||
          `Gagal mengunggah foto ke Telegram (HTTP ${response.status})`
      );
    }

    const fileId = data.result?.document?.file_id;
    if (!fileId) {
      throw new Error("Telegram tidak mengembalikan document.file_id.");
    }

    return { fileId };
  }

  throw new Error("Gagal mengunggah foto ke Telegram setelah beberapa percobaan.");
}

export async function fetchTelegramFile(fileId: string): Promise<{
  buffer: ArrayBuffer;
  contentType: string;
}> {
  const config = await getTelegramConfig();
  if (!config.botToken) {
    throw new Error("Telegram Bot Token belum dikonfigurasi.");
  }

  const metaRes = await fetch(
    `https://api.telegram.org/bot${config.botToken}/getFile?file_id=${encodeURIComponent(
      fileId
    )}`
  );
  const meta = (await metaRes.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    result?: { file_path?: string };
  } | null;

  if (!metaRes.ok || !meta?.ok || !meta.result?.file_path) {
    throw new Error(meta?.description || "File foto tidak ditemukan di Telegram.");
  }

  const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${meta.result.file_path}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    throw new Error(`Gagal mengunduh file dari Telegram (HTTP ${fileRes.status}).`);
  }

  const buffer = await fileRes.arrayBuffer();
  const contentType = fileRes.headers.get("content-type") || "image/jpeg";
  return { buffer, contentType };
}

export async function testTelegramConnection(
  botToken: string,
  channelId: string
): Promise<{
  botUsername: string;
  botFirstName: string;
  chatTitle: string;
  chatType: string;
}> {
  const meRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getMe`
  );
  const meData = (await meRes.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    result?: { username?: string; first_name?: string };
  } | null;

  if (!meRes.ok || !meData?.ok || !meData.result) {
    throw new Error(
      meData?.description || "Bot Token tidak valid (getMe gagal)."
    );
  }

  const chatRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(
      channelId
    )}`
  );
  const chatData = (await chatRes.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    result?: { title?: string; type?: string; username?: string };
  } | null;

  if (!chatRes.ok || !chatData?.ok || !chatData.result) {
    throw new Error(
      chatData?.description ||
        "Channel ID tidak dapat diakses oleh bot (pastikan bot sudah menjadi Admin di channel)."
    );
  }

  return {
    botUsername: meData.result.username || "-",
    botFirstName: meData.result.first_name || "-",
    chatTitle: chatData.result.title || chatData.result.username || channelId,
    chatType: chatData.result.type || "channel",
  };
}
