"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      router.push("/setup");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#FAFAFA" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div
              className="w-14 h-14 flex items-center justify-center neo-border neo-shadow"
              style={{ background: "#FFCC00" }}
            >
              <Zap size={28} strokeWidth={3} />
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              GasCatet
            </h1>
          </div>
          <p className="text-base" style={{ color: "#666" }}>
            Bikin akun dulu, baru gas catet! ⚡
          </p>
        </div>

        {/* Card */}
        <div className="neo-card p-8">
          <h2 className="font-heading text-2xl font-bold mb-6">Daftar</h2>

          {error && (
            <div
              className="neo-border p-3 mb-4 text-sm font-medium"
              style={{ background: "#FF3B30", color: "white" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-heading text-sm font-bold mb-2 uppercase tracking-wider">
                Nama
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="neo-input w-full px-4 py-3 text-base"
                placeholder="Nama kamu"
                required
              />
            </div>

            <div>
              <label className="block font-heading text-sm font-bold mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="neo-input w-full px-4 py-3 text-base"
                placeholder="email@kamu.com"
                required
              />
            </div>

            <div>
              <label className="block font-heading text-sm font-bold mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input w-full px-4 py-3 pr-12 text-base"
                  placeholder="Min. 6 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#666" }}
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn w-full py-3 px-6 text-base text-white"
              style={{ background: "#00C781" }}
            >
              {loading ? "Loading..." : "Gas Daftar! 🚀"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            Udah punya akun?{" "}
            <Link
              href="/login"
              className="font-bold underline decoration-2 underline-offset-2"
              style={{ color: "#FF3B30" }}
            >
              Masuk sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
