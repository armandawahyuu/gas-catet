"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { Shield, Zap, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
      return;
    }
    if (profile) {
      adminApi
        .check()
        .then((r) => {
          if (!r.is_admin) {
            router.push("/dashboard");
          } else {
            setAuthorized(true);
          }
        })
        .catch(() => router.push("/dashboard"))
        .finally(() => setChecking(false));
    }
  }, [loading, profile, router]);

  if (loading || checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#121212" }}
      >
        <div className="font-heading text-xl font-bold animate-pulse text-white">
          Loading...
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen" style={{ background: "#0F0F0F" }}>
      {/* Admin Top Bar */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: "#1A1A1A",
          borderBottom: "3px solid #FF3B30",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 flex items-center justify-center neo-border"
            style={{ background: "#FF3B30" }}
          >
            <Shield size={20} strokeWidth={3} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-white tracking-tight">
              GasCatet Admin
            </h1>
            <p className="text-xs" style={{ color: "#888" }}>
              {profile?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 neo-border font-heading text-xs font-bold uppercase tracking-wider transition-all hover:opacity-80"
            style={{ background: "#FFCC00", color: "#121212" }}
          >
            <ArrowLeft size={14} strokeWidth={3} />
            Dashboard
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 neo-border font-heading text-xs font-bold uppercase tracking-wider transition-all hover:opacity-80"
            style={{ background: "#FF3B30", color: "#FFF" }}
          >
            <LogOut size={14} strokeWidth={3} />
            Keluar
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
