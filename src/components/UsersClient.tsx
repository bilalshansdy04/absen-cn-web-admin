"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserPlus,
  KeyRound,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface UserRow {
  id: string;
  employee_code: string;
  full_name: string;
  role_code: "sys_custodian" | "fld_coord" | "fld_member";
  role_label: string;
  is_first_login: boolean;
  is_active: boolean;
  created_by: string | null;
}

export function UsersClient({
  currentUserRole,
}: {
  currentUserRole: "sys_custodian" | "fld_coord" | "fld_member";
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleCode, setRoleCode] = useState<
    "sys_custodian" | "fld_coord" | "fld_member"
  >("fld_member");
  const [submitting, setSubmitting] = useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/v1/admin/users${qs}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_code: employeeCode.trim().toUpperCase(),
          full_name: fullName.trim(),
          role_code:
            currentUserRole === "sys_custodian" ? roleCode : "fld_member",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "error", text: data.error || "Gagal membuat akun." });
        return;
      }
      setNotice({
        type: "success",
        text: `Akun ${data.user.employee_code} (${data.user.role_label}) berhasil dibuat! Kata sandi bawaan: ${data.default_password}`,
      });
      setEmployeeCode("");
      setFullName("");
      fetchUsers();
    } catch {
      setNotice({ type: "error", text: "Gagal terhubung ke server." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(u: UserRow) {
    setNotice(null);
    const res = await fetch(`/api/v1/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice({
        type: "error",
        text: data.error || "Gagal mengubah status.",
      });
      return;
    }
    fetchUsers();
  }

  async function handleResetPassword(u: UserRow) {
    setNotice(null);
    const res = await fetch(`/api/v1/admin/users/${u.id}/reset-password`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice({ type: "error", text: data.error || "Gagal reset sandi." });
      return;
    }
    setNotice({
      type: "success",
      text: `Kata sandi ${u.employee_code} direset ke: ${data.default_password}`,
    });
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manajemen Akun</h1>
        <p className="text-sm text-slate-500">
          Buat akun anggota, reset kata sandi bawaan, dan atur status aktif
        </p>
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

      {/* Form Buat Akun */}
      <form
        onSubmit={handleCreateUser}
        className="bg-white p-5 rounded-xl border border-slate-200 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>Tambah Akun Baru</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              ID Karyawan
            </label>
            <input
              type="text"
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="CHK-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 uppercase"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Budi Santoso"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Peran (Role)
            </label>
            <select
              value={
                currentUserRole === "sys_custodian" ? roleCode : "fld_member"
              }
              onChange={(e) =>
                setRoleCode(
                  e.target.value as
                    | "sys_custodian"
                    | "fld_coord"
                    | "fld_member",
                )
              }
              disabled={currentUserRole !== "sys_custodian"}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white disabled:bg-slate-100"
            >
              <option value="fld_member">
                Field Member (Checker / Mobile)
              </option>
              {currentUserRole === "sys_custodian" && (
                <>
                  <option value="fld_coord">
                    Field Coordinator (Admin Kantor)
                  </option>
                  <option value="sys_custodian">
                    System Custodian (Admin Web)
                  </option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Membuat..." : "Buat Akun"}
          </button>
        </div>
      </form>

      {/* Search & Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID atau nama..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="users-table-caption"
          className="table-wrapper"
        >
          <table className="responsive-table text-sm text-left">
            <caption id="users-table-caption" className="sr-only">
              Daftar akun pengguna sistem presensi
            </caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">
                  ID Karyawan
                </th>
                <th scope="col" className="px-4 py-3">
                  Nama Lengkap
                </th>
                <th scope="col" className="px-4 py-3">
                  Peran
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Memuat daftar akun...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Belum ada akun ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const canManage =
                    currentUserRole === "sys_custodian" ||
                    u.role_code === "fld_member";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <th
                        scope="row"
                        className="px-4 py-3 font-mono font-semibold text-slate-800"
                      >
                        {u.employee_code}
                      </th>
                      <td data-label="Nama Lengkap" className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {u.full_name}
                        </div>
                        {u.is_first_login && (
                          <span className="inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                            Belum ganti sandi bawaan
                          </span>
                        )}
                      </td>
                      <td
                        data-label="Peran"
                        className="px-4 py-3 text-slate-700"
                      >
                        {u.role_label}
                      </td>
                      <td data-label="Status" className="px-4 py-3">
                        <button
                          disabled={!canManage}
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-40 ${
                            u.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {u.is_active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td data-label="Aksi" className="px-4 py-3 text-right">
                        {canManage && (
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Sandi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
