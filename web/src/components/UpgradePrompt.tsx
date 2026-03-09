"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  return (
    <div className="max-w-md mx-auto mt-12 text-center">
      <div
        className="neo-border p-8"
        style={{ background: "#FFF3E0" }}
      >
        <div className="w-16 h-16 neo-border mx-auto mb-4 flex items-center justify-center" style={{ background: "#FF6B00" }}>
          <Lock size={32} strokeWidth={3} color="#fff" />
        </div>
        <h2 className="text-xl font-black mb-2">Fitur Pro ☕</h2>
        <p className="text-sm opacity-70 mb-4">
          <strong>{feature}</strong> khusus untuk pengguna paket Pro.
        </p>
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-2 neo-border px-6 py-3 font-bold text-white hover:-translate-y-0.5 transition-transform"
          style={{ background: "#FF6B00" }}
        >
          <Sparkles size={18} strokeWidth={3} />
          Upgrade ke Pro — Rp35rb/bulan
        </Link>
        <p className="text-xs opacity-50 mt-3">
          Unlimited dompet, budget, goals, recurring, scan struk AI, export CSV, dan lainnya!
        </p>
      </div>
    </div>
  );
}

interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className }: ProBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 neo-border ${className || ""}`}
      style={{ background: "#FF6B00", color: "#fff" }}
    >
      <Sparkles size={10} strokeWidth={3} /> PRO
    </span>
  );
}
