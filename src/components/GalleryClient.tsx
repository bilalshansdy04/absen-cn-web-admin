"use client";

import { useEffect, useState, useCallback } from "react";
import JSZip from "jszip";
import { Archive, Search, CheckSquare, Square } from "lucide-react";

interface PhotoItem {
  key: string;
  fileId: string;
  filename: string;
  type: "CHECK-IN" | "CHECK-OUT";
  employeeCode: string;
  fullName: string;
  date: string;
  time: string;
}

export function GalleryClient({ defaultDate }: { defaultDate: string }) {
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [search, setSearch] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        limit: "50",
      });
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/v1/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items: PhotoItem[] = [];
        for (const l of data.logs || []) {
          if (l.check_in_tg_file_id) {
            items.push({
              key: `${l.id}-in`,
              fileId: l.check_in_tg_file_id,
              filename: `IN_${l.employee_code}_${l.attendance_date}.jpg`,
              type: "CHECK-IN",
              employeeCode: l.employee_code,
              fullName: l.full_name,
              date: l.attendance_date,
              time: l.check_in_at || "",
            });
          }
          if (l.check_out_tg_file_id) {
            items.push({
              key: `${l.id}-out`,
              fileId: l.check_out_tg_file_id,
              filename: `OUT_${l.employee_code}_${l.attendance_date}.jpg`,
              type: "CHECK-OUT",
              employeeCode: l.employee_code,
              fullName: l.full_name,
              date: l.attendance_date,
              time: l.check_out_at || "",
            });
          }
        }
        setPhotos(items);
        setSelected({});
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, search]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const selectedItems = photos.filter((p) => selected[p.key]);
  const allSelected = photos.length > 0 && selectedItems.length === photos.length;

  function toggleAll() {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      for (const p of photos) next[p.key] = true;
      setSelected(next);
    }
  }

  async function handleDownloadZip() {
    const targets = selectedItems.length > 0 ? selectedItems : photos;
    if (targets.length === 0) return;

    setZipping(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        targets.map(async (item) => {
          const res = await fetch(
            `/api/v1/admin/photos/${encodeURIComponent(item.fileId)}`
          );
          if (res.ok) {
            const blob = await res.blob();
            zip.file(item.filename, blob);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foto_presensi_${startDate}_sd_${endDate}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Galeri Foto Absensi
          </h1>
          <p className="text-sm text-slate-500">
            Foto ber-watermark dari channel Telegram (unduh massal .zip di browser)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            disabled={photos.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allSelected ? "Batal Pilih" : "Pilih Semua"}
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={photos.length === 0 || zipping}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            {zipping
              ? "Mengompres ZIP..."
              : `Unduh ${selectedItems.length > 0 ? selectedItems.length : photos.length} Foto (.zip)`}
          </button>
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
            onChange={(e) => setStartDate(e.target.value)}
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
            onChange={(e) => setEndDate(e.target.value)}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: Budi atau MBR-001"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Memuat galeri foto...
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Tidak ada foto absensi pada rentang tanggal ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {photos.map((item) => {
            const isChecked = !!selected[item.key];
            return (
              <div
                key={item.key}
                onClick={() =>
                  setSelected((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition ${
                  isChecked
                    ? "border-emerald-500 ring-2 ring-emerald-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="aspect-[3/4] bg-slate-900 relative">
                  <img
                    src={`/api/v1/admin/photos/${encodeURIComponent(
                      item.fileId
                    )}`}
                    alt={item.filename}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-bold text-white ${
                      item.type === "CHECK-IN"
                        ? "bg-emerald-600"
                        : "bg-orange-500"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {item.fullName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.employeeCode} • {item.date}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
