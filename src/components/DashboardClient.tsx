"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  LogOut as LogOutIcon,
  ClipboardList,
  Images,
  Send,
  Trash2,
  ArrowRight,
} from "lucide-react";
import type { AdminSessionUser } from "./AdminShell";

interface Metrics {
  total_active_members: number;
  checked_in_today: number;
  not_checked_in_today: number;
  checked_out_today: number;
}

interface RecentLog {
  id: string;
  user_id: string;
  employee_code: string;
  full_name: string;
  check_in_at: string | null;
  check_out_at: string | null;
}

function formatWibTime(iso: string | null): string {
  if (!iso) return "-";
  const match = iso.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} WIB` : iso;
}

export function DashboardClient({
  user,
  todayDate,
}: {
  user: AdminSessionUser;
  todayDate: string;
}) {
  const [metrics, setMetrics] = useState<Metrics>({
    total_active_members: 0,
    checked_in_today: 0,
    not_checked_in_today: 0,
    checked_out_today: 0,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/v1/admin/logs?start_date=${todayDate}&end_date=${todayDate}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) setMetrics(data.metrics);
          setRecentLogs(data.logs || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [todayDate]);

  const quickLinks = [
    {
      href: "/logs",
      title: "Log Kehadiran",
      desc: "Pantau presensi harian, detail GPS & ekspor Excel",
      icon: ClipboardList,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      href: "/users",
      title: "Manajemen Akun",
      desc: "Kelola akun, edit profil, reset sandi & histori per akun",
      icon: Users,
      color: "bg-sky-50 text-sky-700",
    },
    {
      href: "/gallery",
      title: "Galeri Foto",
      desc: "Lihat foto ber-watermark & unduh massal (.zip)",
      icon: Images,
      color: "bg-indigo-50 text-indigo-700",
    },
    ...(user.role_code === "sys_custodian"
      ? [
          {
            href: "/logs/deleted",
            title: "Histori Terhapus",
            desc: "Arsip log absensi yang dihapus oleh Super Admin",
            icon: Trash2,
            color: "bg-rose-50 text-rose-700",
          },
          {
            href: "/settings",
            title: "API Channel Telegram",
            desc: "Atur Bot Token, Channel ID & uji koneksi penyimpanan",
            icon: Send,
            color: "bg-amber-50 text-amber-700",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Selamat Datang, {user.full_name}
        </h1>
        <p className="text-sm text-slate-500">
          {user.role_label} • Ringkasan Presensi Tanggal {todayDate} (Reset
          04:00 WIB)
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Total Pekerja Aktif</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.total_active_members}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-medium mb-2">
            <span>Sudah Check-In</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {metrics.checked_in_today}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 text-xs font-medium mb-2">
            <span>Belum Check-In</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {metrics.not_checked_in_today}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sky-600 text-xs font-medium mb-2">
            <span>Sudah Check-Out</span>
            <LogOutIcon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-sky-700">
            {metrics.checked_out_today}
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition flex items-start gap-4"
              >
                <div className={`p-3 rounded-xl shrink-0 ${q.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">
                      {q.title}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{q.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Today Logs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">
            Aktivitas Presensi Terbaru Hari Ini
          </h2>
          <Link
            href="/logs"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Lihat Semua →
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Memuat aktivitas...
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Belum ada presensi hari ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.map((l) => (
              <div
                key={l.id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div>
                  <Link
                    href={`/users/${l.user_id}`}
                    className="font-semibold text-sm text-slate-900 hover:text-emerald-700 hover:underline"
                  >
                    {l.full_name}
                  </Link>
                  <div className="text-xs text-slate-500">{l.employee_code}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-medium text-emerald-700">
                    In: {formatWibTime(l.check_in_at)}
                  </div>
                  <div className="font-medium text-orange-700">
                    Out: {formatWibTime(l.check_out_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
