"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { Shield, LogOut, Zap } from "lucide-react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");

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
          // Decode email from JWT
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
    <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-6 py-4 neo-border"
        style={{
          background: "#FFFFFF",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: "3px solid #121212",
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
            <div className="flex items-center gap-2">
              <Zap size={16} strokeWidth={3} style={{ color: "#FFCC00" }} />
              <h1 className="font-heading text-lg font-bold tracking-tight">
                GasCatet Admin
              </h1>
            </div>
            <p className="text-xs" style={{ color: "#666" }}>
              {email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 neo-border neo-shadow font-heading text-xs font-bold uppercase tracking-wider transition-all hover:translate-y-0.5 hover:shadow-none"
          style={{ background: "#FF3B30", color: "#FFF" }}
        >
          <LogOut size={14} strokeWidth={3} />
          Keluar
        </button>
      </header>

      {/* Content */}
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
