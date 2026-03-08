"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import {
  Shield,
  LogOut,
  Zap,
  LayoutDashboard,
  TrendingUp,
  Users,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dashboard/growth", label: "Growth", icon: TrendingUp },
  { href: "/admin/dashboard/users", label: "Users", icon: Users },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin");
      return;
    }
    adminApi
      .check()
      .then((r) => {
        if (!r.is_admin) {
          router.push("/admin");
        } else {
          setAuthorized(true);
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setEmail(payload.email || "");
          } catch {}
        }
      })
      .catch(() => router.push("/admin"))
      .finally(() => setChecking(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin");
  };

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FAFAFA" }}
      >
        <div className="font-heading text-xl font-bold animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#FAFAFA" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 neo-border flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#FFFFFF", borderRight: "3px solid #121212" }}
      >
        {/* Logo */}
        <div
          className="p-5 flex items-center gap-3"
          style={{ borderBottom: "3px solid #121212" }}
        >
          <div
            className="w-10 h-10 flex items-center justify-center neo-border"
            style={{ background: "#FF3B30" }}
          >
            <Shield size={20} strokeWidth={3} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <Zap size={14} strokeWidth={3} style={{ color: "#FFCC00" }} />
              <span className="font-heading text-sm font-bold tracking-tight">
                GasCatet Admin
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "#666" }}>
              {email}
            </p>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 font-heading text-sm font-bold uppercase tracking-wider transition-all ${
                  active
                    ? "neo-border neo-shadow text-white"
                    : "hover:bg-gray-100"
                }`}
                style={active ? { background: "#FF3B30" } : {}}
              >
                <item.icon size={18} strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4" style={{ borderTop: "3px solid #121212" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-heading font-bold uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "#FF3B30" }}
          >
            <LogOut size={16} strokeWidth={2.5} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-60">
        {/* Mobile header */}
        <div
          className="lg:hidden flex items-center gap-3 p-4"
          style={{ borderBottom: "3px solid #121212", background: "#FFFFFF" }}
        >
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center neo-border"
              style={{ background: "#FF3B30" }}
            >
              <Shield size={16} strokeWidth={3} className="text-white" />
            </div>
            <span className="font-heading text-lg font-bold">Admin</span>
          </div>
        </div>

        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
