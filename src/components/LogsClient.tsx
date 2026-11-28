"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Search,
  Users,
  CheckCircle2,
  Clock,
  LogOut as LogOutIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";

interface AttendanceLog {
  id: string;
  employee_code: string;
  full_name: string;
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
}

interface Metrics {
  total_active_members: number;
  checked_in_today: number;
  not_checked_in_today: number;
  checked_out_today: number;
}

function formatWibTime(iso: string | null): string {
  if (!iso) return "-";
  const match = iso.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} WIB` : iso;
}

export function LogsClient({ defaultDate }: { defaultDate: string }) {
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total_active_members: 0,
    checked_in_today: 0,
    not_checked_in_today: 0,
    checked_out_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<{
    fileId: string;
    title: string;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (previewPhoto) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [previewPhoto]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Fallback for browsers without closedBy support (e.g., Safari)
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
      };
      dialog.addEventListener("click", handleClick);
      return () => dialog.removeEventListener("click", handleClick);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        page: String(page),
        limit: "50",
      });
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/v1/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setMetrics(data.metrics || metrics);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function exportData(format: "xlsx" | "csv") {
    const rows = logs.map((l) => ({
      Tanggal: l.attendance_date,
      "ID Karyawan": l.employee_code,
      "Nama Lengkap": l.full_name,
      "Check-In": formatWibTime(l.check_in_at),
      "Lokasi Check-In": l.check_in_address || "-",
      "Check-Out": formatWibTime(l.check_out_at),
      "Lokasi Check-Out": l.check_out_address || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presensi");
    XLSX.writeFile(
      workbook,
      `presensi_${startDate}_sd_${endDate}.${format}`,
      { bookType: format }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pemantauan Kehadiran
          </h1>
          <p className="text-sm text-slate-500">
            Ringkasan metrik hari ini dan log presensi lapangan (WIB)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportData("csv")}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            onClick={() => exportData("xlsx")}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ekspor Excel
          </button>
        </div>
      </div>

      {/* Today's Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Total Anggota Aktif</span>
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-end">
        <div className="w-full md:w-auto">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Cari Nama / ID Karyawan
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Contoh: Budi atau MBR-001"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="attendance-table-caption"
          className="table-wrapper"
        >
          <table className="responsive-table text-sm text-left">
            <caption id="attendance-table-caption" className="sr-only">
              Daftar log kehadiran anggota lapangan
            </caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Tanggal</th>
                <th scope="col" className="px-4 py-3">Anggota</th>
                <th scope="col" className="px-4 py-3">Check-In</th>
                <th scope="col" className="px-4 py-3">Check-Out</th>
                <th scope="col" className="px-4 py-3 text-right">Bukti Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Memuat data kehadiran...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada log kehadiran pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap"
                    >
                      {log.attendance_date}
                    </th>
                    <td data-label="Anggota" className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {log.full_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {log.employee_code}
                      </div>
                    </td>
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
                    <td
                      data-label="Bukti Foto"
                      className="px-4 py-3 text-right space-x-2 whitespace-nowrap"
                    >
                      {log.check_in_tg_file_id && (
                        <button
                          onClick={() =>
                            setPreviewPhoto({
                              fileId: log.check_in_tg_file_id!,
                              title: `Check-In • ${log.full_name} (${log.attendance_date})`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          In
                        </button>
                      )}
                      {log.check_out_tg_file_id && (
                        <button
                          onClick={() =>
                            setPreviewPhoto({
                              fileId: log.check_out_tg_file_id!,
                              title: `Check-Out • ${log.full_name} (${log.attendance_date})`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-medium cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Sebelumnya
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal (native dialog with closedby="any" + fallback) */}
      <dialog
        ref={dialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        aria-labelledby="photo-dialog-title"
        onClose={() => setPreviewPhoto(null)}
        className="photo-dialog m-auto rounded-2xl max-w-lg w-[calc(100%-2rem)] p-0 overflow-hidden shadow-xl border border-slate-200 bg-white"
      >
        {previewPhoto && (
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="photo-dialog-title"
                className="font-semibold text-sm text-slate-900"
              >
                {previewPhoto.title}
              </h2>
              <button
                type="button"
                aria-label="Tutup pratinjau foto"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center p-2">
              <img
                src={`/api/v1/admin/photos/${encodeURIComponent(
                  previewPhoto.fileId
                )}`}
                alt={previewPhoto.title}
                className="max-h-[75vh] object-contain rounded"
              />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
