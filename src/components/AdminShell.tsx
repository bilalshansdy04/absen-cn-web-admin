"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Users,
  Images,
  Send,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export interface AdminSessionUser {
  id: string;
  employee_code: string;
  full_name: string;
  role_code: "sys_custodian" | "fld_coord" | "fld_member";
  role_label: string;
}

export function AdminShell({
  user,
  children,
}: {
  user: AdminSessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/logs", label: "Log Kehadiran", icon: ClipboardList },
    { href: "/users", label: "Manajemen Akun", icon: Users },
    { href: "/gallery", label: "Galeri Foto", icon: Images },
    ...(user.role_code === "sys_custodian"
      ? [{ href: "/settings", label: "API Channel Telegram", icon: Send }]
      : []),
  ];

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">Presensi Admin</div>
            <div className="text-xs text-slate-400 truncate">
              Zero-Cost Architecture
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white truncate">
              {user.full_name}
            </div>
            <div className="text-xs text-slate-400">
              {user.employee_code} • {user.role_label}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
