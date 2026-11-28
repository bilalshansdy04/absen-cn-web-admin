"use client";

import { useEffect, useState } from "react";
import {
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  PlugZap,
  Save,
  Info,
} from "lucide-react";

interface TelegramSettingsState {
  is_configured: boolean;
  bot_token_masked: string;
  channel_id: string;
  source: "database" | "env" | "unconfigured";
  updated_at: string | null;
}

export function SettingsClient() {
  const [status, setStatus] = useState<TelegramSettingsState | null>(null);
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/settings/telegram");
      if (res.ok) {
        const data = (await res.json()) as TelegramSettingsState;
        setStatus(data);
        setChannelId(data.channel_id || "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/settings/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_token: botToken.trim() || undefined,
          channel_id: channelId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          type: "error",
          text: data.error || "Gagal menyimpan konfigurasi.",
        });
        return;
      }
      setBotToken("");
      setNotice({
        type: "success",
        text: data.message || "Konfigurasi Telegram berhasil disimpan.",
      });
      loadSettings();
    } catch {
      setNotice({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setNotice(null);
    setTesting(true);
    try {
      const res = await fetch("/api/v1/admin/settings/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_token: botToken.trim() || undefined,
          channel_id: channelId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          type: "error",
          text: data.error || "Uji koneksi gagal.",
        });
        return;
      }
      setNotice({
        type: "success",
        text: data.message,
      });
    } catch {
      setNotice({ type: "error", text: "Gagal melakukan uji koneksi." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pengaturan API Channel Telegram Bot
          </h1>
          <p className="text-sm text-slate-500">
            Atur Bot Token dan Private Channel ID sebagai penyimpanan foto
            presensi gratis (khusus System Custodian)
          </p>
        </div>

        {status && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
              status.is_configured
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {status.is_configured
              ? `Terkonfigurasi (${status.source === "database" ? "Database" : "Env"})`
              : "Belum Dikonfigurasi"}
          </span>
        )}
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span className="font-medium">{notice.text}</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white p-6 rounded-xl border border-slate-200 space-y-5"
      >
        {loading ? (
          <div className="text-sm text-slate-400 py-4">
            Memuat konfigurasi Telegram...
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Telegram Bot Token
              </label>
              {status?.bot_token_masked && (
                <p className="text-xs text-slate-500 mb-1.5">
                  Token saat ini:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                    {status.bot_token_masked}
                  </code>{" "}
                  (biarkan kosong jika tidak ingin mengganti token)
                </p>
              )}
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder={
                    status?.bot_token_masked
                      ? "Isi hanya jika ingin mengganti token"
                      : "Contoh: 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxx"
                  }
                  className="w-full pr-10 pl-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Private Channel ID
              </label>
              <input
                type="text"
                required
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Contoh: -1001234567890"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Untuk Private Channel, ID diawali dengan <code>-100</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                <PlugZap className="w-4 h-4 text-sky-600" />
                {testing ? "Menguji..." : "Uji Koneksi Bot & Channel"}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 text-sm text-sky-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="w-4 h-4 text-sky-700" />
          <span>Panduan Singkat Setup Telegram Channel</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-xs text-sky-800">
          <li>
            Buat bot baru melalui <strong>@BotFather</strong> di Telegram dan
            salin <strong>Bot Token</strong>.
          </li>
          <li>
            Buat <strong>Private Channel</strong> baru di Telegram khusus untuk
            arsip foto presensi.
          </li>
          <li>
            Tambahkan bot tersebut sebagai <strong>Administrator</strong> di
            Private Channel (beri izin <em>Post Messages</em>).
          </li>
          <li>
            Kirim 1 pesan percobaan ke channel lalu teruskan (forward) ke{" "}
            <strong>@userinfobot</strong> atau <strong>@RawDataBot</strong>{" "}
            untuk mendapatkan ID Channel (format <code>-100xxxxxxxxxx</code>).
          </li>
          <li>
            Masukkan kedua nilai di atas, klik <strong>Uji Koneksi</strong>,
            lalu klik <strong>Simpan Konfigurasi</strong>.
          </li>
        </ol>
      </div>
    </div>
  );
}
