"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Download,
  Eye,
  MapPin,
  X,
} from "lucide-react";

interface UserProfile {
  id: string;
  employee_code: string;
  full_name: string;
  role_label: string;
  is_active: boolean;
  is_deleted: boolean;
}

interface UserLog {
  id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_address: string | null;
  check_in_tg_file_id: string | null;
  check_out_at: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_address: string | null;
  check_out_tg_file_id: string | null;
  duration_minutes: number | null;
}

function formatWibTime(iso: string | null): string {
  if (!iso) return "-";
  const match = iso.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} WIB` : iso;
}

function formatDuration(mins: number | null): string {
  if (mins == null) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} jam ${m} mnt`;
}

export function UserHistoryClient({
  userId,
  defaultStartDate,
  defaultEndDate,
}: {
  userId: string;
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState({
    total_days_present: 0,
    total_completed_days: 0,
    total_work_minutes: 0,
  });
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLog, setDetailLog] = useState<UserLog | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (detailLog) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [detailLog]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      const res = await fetch(
        `/api/v1/admin/users/${userId}/logs?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setSummary(data.summary);
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport() {
    if (!profile) return;
    const rows = logs.map((l) => ({
      Tanggal: l.attendance_date,
      "ID Karyawan": profile.employee_code,
      Nama: profile.full_name,
      "Check-In": formatWibTime(l.check_in_at),
      "Lokasi Check-In": l.check_in_address || "-",
      "Check-Out": formatWibTime(l.check_out_at),
      "Lokasi Check-Out": l.check_out_address || "-",
      Durasi: formatDuration(l.duration_minutes),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histori");
    XLSX.writeFile(
      wb,
      `histori_${profile.employee_code}_${startDate}_sd_${endDate}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Manajemen Akun
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {profile ? profile.full_name : "Histori Absen Per Akun"}
          </h1>
          {profile && (
            <p className="text-sm text-slate-500">
              {profile.employee_code} • {profile.role_label}
              {profile.is_deleted
                ? " • (Akun Dihapus)"
                : !profile.is_active
                  ? " • (Nonaktif)"
                  : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Ekspor Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Total Hari Hadir</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary.total_days_present} Hari
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Hari Selesai (In &amp; Out)</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-700">
            {summary.total_completed_days} Hari
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Akumulasi Jam Kerja</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {formatDuration(summary.total_work_minutes)}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div tabIndex={0} role="region" aria-label="Histori absensi akun" className="table-wrapper">
          <table className="responsive-table text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Tanggal</th>
                <th scope="col" className="px-4 py-3">Check-In</th>
                <th scope="col" className="px-4 py-3">Check-Out</th>
                <th scope="col" className="px-4 py-3">Durasi</th>
                <th scope="col" className="px-4 py-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Memuat histori akun...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada riwayat absensi pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <th scope="row" className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {log.attendance_date}
                    </th>
                    <td data-label="Check-In" className="px-4 py-3">
                      <div className="font-medium text-emerald-700">
                        {formatWibTime(log.check_in_at)}
                      </div>
                      <div className="text-xs text-slate-500 max-w-xs truncate">
                        {log.check_in_address || "-"}
                      </div>
                    </td>
                    <td data-label="Check-Out" className="px-4 py-3">
                      <div className="font-medium text-orange-700">
                        {formatWibTime(log.check_out_at)}
                      </div>
                      <div className="text-xs text-slate-500 max-w-xs truncate">
                        {log.check_out_address || "-"}
                      </div>
                    </td>
                    <td data-label="Durasi" className="px-4 py-3 font-medium text-slate-700">
                      {formatDuration(log.duration_minutes)}
                    </td>
                    <td data-label="Detail" className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <dialog
        ref={dialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        onClose={() => setDetailLog(null)}
        className="photo-dialog m-auto rounded-2xl max-w-3xl w-[calc(100%-2rem)] p-0 overflow-hidden shadow-xl border border-slate-200 bg-white"
      >
        {detailLog && (
          <div>
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Detail Presensi • {detailLog.attendance_date}
                </h2>
                <p className="text-xs text-slate-500">
                  {profile?.full_name} ({profile?.employee_code}) • Durasi:{" "}
                  {formatDuration(detailLog.duration_minutes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailLog(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[78vh] overflow-y-auto">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-emerald-700">
                  Check-In • {formatWibTime(detailLog.check_in_at)}
                </div>
                <p className="text-xs text-slate-600">
                  {detailLog.check_in_address || "-"}
                </p>
                {detailLog.check_in_lat != null &&
                  detailLog.check_in_lng != null && (
                    <a
                      href={`https://maps.google.com/?q=${detailLog.check_in_lat},${detailLog.check_in_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Buka Koordinat di Maps ({detailLog.check_in_lat.toFixed(5)},{" "}
                      {detailLog.check_in_lng.toFixed(5)})
                    </a>
                  )}
                {detailLog.check_in_tg_file_id && (
                  <img
                    src={`/api/v1/admin/photos/${encodeURIComponent(
                      detailLog.check_in_tg_file_id
                    )}`}
                    alt="Foto Check-In"
                    className="w-full rounded-xl border border-slate-200 object-contain max-h-80 bg-slate-950"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-orange-700">
                  Check-Out • {formatWibTime(detailLog.check_out_at)}
                </div>
                <p className="text-xs text-slate-600">
                  {detailLog.check_out_address || "-"}
                </p>
                {detailLog.check_out_lat != null &&
                  detailLog.check_out_lng != null && (
                    <a
                      href={`https://maps.google.com/?q=${detailLog.check_out_lat},${detailLog.check_out_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Buka Koordinat di Maps ({detailLog.check_out_lat.toFixed(5)},{" "}
                      {detailLog.check_out_lng.toFixed(5)})
                    </a>
                  )}
                {detailLog.check_out_tg_file_id && (
                  <img
                    src={`/api/v1/admin/photos/${encodeURIComponent(
                      detailLog.check_out_tg_file_id
                    )}`}
                    alt="Foto Check-Out"
                    className="w-full rounded-xl border border-slate-200 object-contain max-h-80 bg-slate-950"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
