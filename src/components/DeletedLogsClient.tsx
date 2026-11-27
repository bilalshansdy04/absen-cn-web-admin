"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Image as ImageIcon, X, Trash2 } from "lucide-react";

interface DeletedLog {
  id: string;
  user_id: string;
  employee_code: string;
  full_name: string;
  attendance_date: string;
  check_in_at: string | null;
  check_in_address: string | null;
  check_in_tg_file_id: string | null;
  check_out_at: string | null;
  check_out_address: string | null;
  check_out_tg_file_id: string | null;
  deleted_by: string;
  deleted_reason: string | null;
  deleted_at: string;
}

function formatWibTime(iso: string | null): string {
  if (!iso) return "-";
  const match = iso.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} WIB` : iso;
}

export function DeletedLogsClient() {
  const [logs, setLogs] = useState<DeletedLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<{
    fileId: string;
    title: string;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (previewPhoto) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [previewPhoto]);

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/v1/admin/logs/deleted${qs}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDeleted();
  }, [fetchDeleted]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-600" />
            Histori Absen Terhapus
          </h1>
          <p className="text-sm text-slate-500">
            Arsip log presensi yang di-soft delete oleh Super Admin (khusus
            System Custodian)
          </p>
        </div>
        <Link
          href="/logs"
          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
        >
          ← Kembali ke Log Kehadiran
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau ID karyawan..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="deleted-table-caption"
          className="table-wrapper"
        >
          <table className="responsive-table text-sm text-left">
            <caption id="deleted-table-caption" className="sr-only">
              Daftar log presensi yang telah dihapus
            </caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Tanggal Absen</th>
                <th scope="col" className="px-4 py-3">Anggota</th>
                <th scope="col" className="px-4 py-3">Check-In / Out</th>
                <th scope="col" className="px-4 py-3">Dihapus Oleh &amp; Alasan</th>
                <th scope="col" className="px-4 py-3 text-right">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Memuat histori terhapus...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Belum ada log presensi yang dihapus.
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
                      <Link
                        href={`/users/${log.user_id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {log.full_name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {log.employee_code}
                      </div>
                    </td>
                    <td data-label="Check-In / Out" className="px-4 py-3 text-xs">
                      <div className="text-emerald-700 font-medium">
                        In: {formatWibTime(log.check_in_at)}
                      </div>
                      <div className="text-orange-700 font-medium">
                        Out: {formatWibTime(log.check_out_at)}
                      </div>
                    </td>
                    <td data-label="Dihapus Oleh" className="px-4 py-3 text-xs">
                      <div className="font-semibold text-rose-700">
                        Oleh: {log.deleted_by}
                      </div>
                      <div className="text-slate-500">{log.deleted_at}</div>
                      {log.deleted_reason && (
                        <div className="text-slate-700 mt-0.5 italic">
                          &ldquo;{log.deleted_reason}&rdquo;
                        </div>
                      )}
                    </td>
                    <td
                      data-label="Foto"
                      className="px-4 py-3 text-right space-x-2 whitespace-nowrap"
                    >
                      {log.check_in_tg_file_id && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              fileId: log.check_in_tg_file_id!,
                              title: `Check-In (Terhapus) • ${log.full_name}`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          In
                        </button>
                      )}
                      {log.check_out_tg_file_id && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              fileId: log.check_out_tg_file_id!,
                              title: `Check-Out (Terhapus) • ${log.full_name}`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-medium cursor-pointer"
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
      </div>

      <dialog
        ref={dialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        onClose={() => setPreviewPhoto(null)}
        className="photo-dialog m-auto rounded-2xl max-w-lg w-[calc(100%-2rem)] p-0 overflow-hidden shadow-xl border border-slate-200 bg-white"
      >
        {previewPhoto && (
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-900">
                {previewPhoto.title}
              </span>
              <button
                type="button"
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
