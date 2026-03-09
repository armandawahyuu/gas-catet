"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { payment, type PaymentChannel } from "@/lib/api";
import {
  Crown,
  Sparkles,
  Check,
  Wallet,
  Target,
  Repeat,
  Camera,
  Download,
  TrendingUp,
  Flame,
  Loader2,
  ArrowRight,
  CreditCard,
} from "lucide-react";

const PRO_FEATURES = [
  { icon: Wallet, label: "Unlimited Dompet" },
  { icon: Target, label: "Budget & Goals" },
  { icon: Repeat, label: "Transaksi Recurring" },
  { icon: Camera, label: "Scan Struk AI (OCR)" },
  { icon: Download, label: "Export CSV" },
  { icon: TrendingUp, label: "Analitik Lengkap" },
  { icon: Flame, label: "AI Roast Unlimited" },
];

export default function UpgradePage() {
  const { profile } = useAuth();
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [price, setPrice] = useState(35000);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const res = await payment.channels();
      setChannels(res.channels || []);
      if (res.price) setPrice(res.price);
    } catch {
      setError("Gagal memuat metode pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!selected) return;
    try {
      setCreating(true);
      setError(null);
      const res = await payment.createOrder(selected);
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pembayaran");
    } finally {
      setCreating(false);
    }
  };

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  // Group channels by group name
  const grouped = channels.reduce<Record<string, PaymentChannel[]>>((acc, ch) => {
    const g = ch.group || "Lainnya";
    if (!acc[g]) acc[g] = [];
    acc[g].push(ch);
    return acc;
  }, {});

  const selectedChannel = channels.find((c) => c.code === selected);
  const totalFee = selectedChannel?.fee || 0;
  const totalAmount = price + totalFee;

  if (profile?.plan === "pro") {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="neo-border p-8" style={{ background: "#E8F5E9" }}>
          <div
            className="w-16 h-16 neo-border mx-auto mb-4 flex items-center justify-center"
            style={{ background: "#4CAF50" }}
          >
            <Crown size={32} strokeWidth={3} color="#fff" />
          </div>
          <h2 className="text-xl font-black mb-2">Kamu sudah Pro! 🎉</h2>
          <p className="text-sm opacity-70">
            Semua fitur premium sudah aktif di akunmu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div
          className="w-20 h-20 neo-border mx-auto mb-4 flex items-center justify-center"
          style={{ background: "#FF6B00" }}
        >
          <Crown size={40} strokeWidth={3} color="#fff" />
        </div>
        <h1 className="text-2xl font-black">Upgrade ke Pro ⚡</h1>
        <p className="text-sm opacity-70 mt-1">
          Buka semua fitur premium cuma{" "}
          <strong>{formatRp(price)}/bulan</strong>
        </p>
      </div>

      {/* Pro Features */}
      <div className="neo-border p-5" style={{ background: "#FFF8E1" }}>
        <h3 className="font-black text-sm mb-3 flex items-center gap-2">
          <Sparkles size={16} strokeWidth={3} /> Fitur Pro
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PRO_FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <div
                className="w-6 h-6 neo-border flex items-center justify-center flex-shrink-0"
                style={{ background: "#FF6B00" }}
              >
                <Icon size={12} strokeWidth={3} color="#fff" />
              </div>
              <span className="font-bold">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="neo-border p-5 bg-white">
        <h3 className="font-black text-sm mb-4 flex items-center gap-2">
          <CreditCard size={16} strokeWidth={3} /> Pilih Metode Pembayaran
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin" />
            <span className="ml-2 text-sm opacity-70">Memuat...</span>
          </div>
        ) : error && channels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600 font-bold">{error}</p>
            <button
              onClick={loadChannels}
              className="mt-2 text-sm neo-border px-4 py-2 font-bold hover:-translate-y-0.5 transition-transform"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="text-xs font-black opacity-50 uppercase mb-2">
                  {group}
                </p>
                <div className="space-y-2">
                  {items.map((ch) => (
                    <button
                      key={ch.code}
                      onClick={() => setSelected(ch.code)}
                      className={`w-full neo-border p-3 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 ${
                        selected === ch.code
                          ? "ring-2 ring-[#FF6B00] -translate-y-0.5"
                          : ""
                      }`}
                      style={{
                        background:
                          selected === ch.code ? "#FFF3E0" : "#fff",
                      }}
                    >
                      {ch.icon_url ? (
                        <img
                          src={ch.icon_url}
                          alt={ch.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 neo-border flex items-center justify-center bg-gray-100">
                          <CreditCard size={14} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          {ch.name}
                        </p>
                        {ch.fee > 0 && (
                          <p className="text-xs opacity-50">
                            Fee: {formatRp(ch.fee)}
                          </p>
                        )}
                      </div>
                      {selected === ch.code && (
                        <div
                          className="w-6 h-6 neo-border flex items-center justify-center flex-shrink-0"
                          style={{ background: "#FF6B00" }}
                        >
                          <Check size={14} strokeWidth={3} color="#fff" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary & Pay Button */}
      {selected && (
        <div className="neo-border p-5" style={{ background: "#F5F5F5" }}>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span>GasCatet Pro (1 bulan)</span>
              <span className="font-bold">{formatRp(price)}</span>
            </div>
            {totalFee > 0 && (
              <div className="flex justify-between opacity-70">
                <span>Biaya layanan</span>
                <span>{formatRp(totalFee)}</span>
              </div>
            )}
            <div className="border-t-2 border-black pt-2 flex justify-between font-black text-base">
              <span>Total</span>
              <span>{formatRp(totalAmount)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 font-bold mb-3">{error}</p>
          )}

          <button
            onClick={handlePay}
            disabled={creating}
            className="w-full neo-border px-6 py-3 font-black text-white flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#FF6B00" }}
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Bayar {formatRp(totalAmount)}
                <ArrowRight size={18} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
