"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, adminApi } from "@/lib/api";
import { Shield, Eye, EyeOff, Zap } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await auth.login(email, password);
      localStorage.setItem("token", res.token);

      // Check if this user is admin
      const check = await adminApi.check();
      if (!check.is_admin) {
        localStorage.removeItem("token");
        setError("Akun ini bukan admin.");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#FAFAFA" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 flex items-center justify-center neo-border neo-shadow mb-4"
            style={{ background: "#FF3B30" }}
          >
            <Shield size={32} strokeWidth={2.5} className="text-white" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={20} strokeWidth={3} style={{ color: "#FFCC00" }} />
            <h1 className="font-heading text-2xl font-bold">
              GasCatet Admin
            </h1>
          </div>
          <p className="text-sm" style={{ color: "#666" }}>
            Owner Access Only
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div
            className="neo-border neo-shadow p-6 space-y-4"
            style={{ background: "#FFFFFF" }}
          >
            {error && (
              <div
                className="neo-border px-4 py-2 text-sm font-heading font-bold"
                style={{ background: "#FF3B30", color: "#FFF" }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 neo-border font-heading text-sm font-bold focus:outline-none"
                style={{ background: "#FAFAFA" }}
                placeholder="admin@gascatet.id"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 neo-border font-heading text-sm font-bold pr-12 focus:outline-none"
                  style={{ background: "#FAFAFA" }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#666" }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 neo-border neo-shadow font-heading text-sm font-bold uppercase tracking-wider transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-y-0"
              style={{ background: "#FF3B30", color: "#FFF" }}
            >
              {loading ? "Authenticating..." : "Login as Admin"}
            </button>
          </div>
        </form>

        <p
          className="text-center text-xs mt-6 font-heading"
          style={{ color: "#999" }}
        >
          Hanya pemilik aplikasi yang bisa mengakses halaman ini.
        </p>
      </div>
    </div>
  );
}
