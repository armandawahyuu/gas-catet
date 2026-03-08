"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { Shield, LogOut } from "lucide-react";

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
        style={{ background: "#0A0A0A" }}
      >
        <div className="font-heading text-xl font-bold animate-pulse text-white">
          Loading...
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: "#141414",
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
            <p className="text-xs" style={{ color: "#666" }}>
              {email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 neo-border font-heading text-xs font-bold uppercase tracking-wider transition-all hover:opacity-80"
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
