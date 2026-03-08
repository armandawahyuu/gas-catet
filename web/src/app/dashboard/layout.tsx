"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Link2,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  Wallet,
  PiggyBank,
  RefreshCw,
  Target,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transaksi", icon: Receipt },
  { href: "/dashboard/wallets", label: "Dompet", icon: Wallet },
  { href: "/dashboard/budgets", label: "Anggaran", icon: PiggyBank },
  { href: "/dashboard/goals", label: "Target", icon: Target },
  { href: "/dashboard/recurring", label: "Berulang", icon: RefreshCw },
  { href: "/dashboard/analytics", label: "Analitik", icon: BarChart3 },
  { href: "/dashboard/telegram", label: "Telegram", icon: Link2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [loading, profile, router]);

  if (loading) {
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

  if (!profile) return null;

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
        className={`fixed inset-y-0 left-0 z-50 w-64 neo-border flex flex-col transition-transform lg:translate-x-0 ${
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
            style={{ background: "#FFCC00" }}
          >
            <Zap size={20} strokeWidth={3} />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight">
            GasCatet
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-2">
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
                style={
                  active
                    ? { background: "#FF3B30" }
                    : {}
                }
              >
                <item.icon size={18} strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4" style={{ borderTop: "3px solid #121212" }}>
          <div className="mb-3">
            <div className="font-heading text-sm font-bold truncate">
              {profile.name}
            </div>
            <div className="text-xs truncate" style={{ color: "#666" }}>
              {profile.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-heading font-bold uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "#FF3B30" }}
          >
            <LogOut size={16} strokeWidth={2.5} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-64">
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
              style={{ background: "#FFCC00" }}
            >
              <Zap size={16} strokeWidth={3} />
            </div>
            <span className="font-heading text-lg font-bold">GasCatet</span>
          </div>
        </div>

        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
