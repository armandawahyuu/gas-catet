"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { wallets as walletsApi, type WalletItem } from "@/lib/api";
import { Zap, ArrowRight, Check } from "lucide-react";

export default function SetupPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [walletList, setWalletList] = useState<WalletItem[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
      return;
    }
    if (profile) {
      walletsApi
        .list()
        .then((res) => {
          setWalletList(res.wallets);
          const initial: Record<string, string> = {};
          res.wallets.forEach((w) => {
            initial[w.id] = "";
          });
          setBalances(initial);
        })
        .finally(() => setLoadingWallets(false));
    }
  }, [loading, profile, router]);

  const formatNumber = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  };

  const handleBalanceChange = (id: string, val: string) => {
    const raw = val.replace(/\D/g, "");
    setBalances((prev) => ({ ...prev, [id]: raw }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(balances)
        .filter(([, val]) => val && Number(val) > 0)
        .map(([id, val]) => walletsApi.setBalance(id, Number(val)));

      await Promise.all(updates);
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  if (loading || loadingWallets) {
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#FAFAFA" }}
    >
      <div className="w-full max-w-lg">
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
        </div>

        {/* Card */}
        <div className="neo-card p-8">
          {done ? (
            <div className="text-center py-8">
              <div
                className="w-16 h-16 mx-auto mb-4 flex items-center justify-center neo-border neo-shadow"
                style={{ background: "#00C781" }}
              >
                <Check size={32} strokeWidth={3} color="white" />
              </div>
              <h2 className="font-heading text-2xl font-bold mb-2">
                Siap Gas! ⚡
              </h2>
              <p style={{ color: "#666" }}>Mengalihkan ke dashboard...</p>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div
                  className="w-8 h-8 flex items-center justify-center neo-border text-white font-heading font-bold text-sm"
                  style={{ background: "#FF3B30" }}
                >
                  1
                </div>
                <div className="h-0.5 flex-1" style={{ background: "#E0E0E0" }} />
                <div
                  className="w-8 h-8 flex items-center justify-center neo-border font-heading font-bold text-sm"
                  style={{ background: "#E0E0E0", color: "#999" }}
                >
                  2
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold mb-2">
                Halo, {profile.name}! 👋
              </h2>
              <p className="mb-6" style={{ color: "#666" }}>
                Atur saldo awal dompet kamu supaya catatan keuangan langsung
                akurat dari awal. Saldo awal yang tepat = laporan keuangan akurat dari hari pertama.
              </p>

              <div className="space-y-4">
                {walletList.map((wallet) => (
                  <div key={wallet.id} className="neo-border p-4 flex items-center gap-4" style={{ background: "#FFFFFF" }}>
                    <div
                      className="w-12 h-12 flex items-center justify-center neo-border text-2xl flex-shrink-0"
                      style={{ background: "#F5F5F5" }}
                    >
                      {wallet.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block font-heading text-sm font-bold mb-1">
                        {wallet.name}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-heading text-sm font-bold" style={{ color: "#666" }}>
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={balances[wallet.id] ? formatNumber(balances[wallet.id]) : ""}
                          onChange={(e) =>
                            handleBalanceChange(wallet.id, e.target.value)
                          }
                          className="neo-input w-full pl-10 pr-4 py-2.5 text-base"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleSkip}
                  className="flex-1 neo-border px-4 py-3 font-heading font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  style={{ background: "#FFFFFF" }}
                >
                  Lewati
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 neo-border neo-shadow px-4 py-3 font-heading font-bold text-sm uppercase tracking-wider text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: "#00C781" }}
                >
                  {saving ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      Simpan & Lanjut <ArrowRight size={16} strokeWidth={3} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
