"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { user as userApi, telegram as telegramApi } from "@/lib/api";
import { Link2, Check, MessageCircle, Send, ExternalLink, Loader2 } from "lucide-react";

export default function TelegramPage() {
  const { profile, refreshProfile } = useAuth();
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLinked = profile?.telegram_id && profile.telegram_id > 0;

  useEffect(() => {
    telegramApi.info().then((info) => {
      if (info.enabled) setBotUsername(info.username);
    }).catch(() => {});
  }, []);

  // Auto-poll when linking is in progress
  useEffect(() => {
    if (linking && !isLinked) {
      pollRef.current = setInterval(async () => {
        await refreshProfile();
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [linking, isLinked, refreshProfile]);

  // Stop polling when linked
  useEffect(() => {
    if (isLinked && linking) {
      setLinking(false);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [isLinked, linking]);

  const handleConnect = async () => {
    if (!botUsername) return;
    setLoading(true);
    try {
      const res = await userApi.linkTelegram();
      const deepLink = `https://t.me/${botUsername}?start=${res.link_token}`;
      setLinking(true);
      window.open(deepLink, "_blank");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Telegram Bot
        </h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          Catat pengeluaran lebih cepat lewat chat Telegram — tanpa perlu buka aplikasi
        </p>
      </div>

      {/* Status Card */}
      <div className="neo-card p-6 mb-6 max-w-xl">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 flex items-center justify-center neo-border"
            style={{ background: isLinked ? "#00C781" : "#FFCC00" }}
          >
            {isLinked ? (
              <Check size={28} color="white" strokeWidth={3} />
            ) : (
              <Link2 size={28} strokeWidth={3} />
            )}
          </div>
          <div>
            <div className="font-heading text-lg font-bold">
              {isLinked ? "Terhubung! ✅" : "Belum Terhubung"}
            </div>
            <div className="text-sm" style={{ color: "#666" }}>
              {isLinked
                ? `Telegram ID: ${profile.telegram_id}`
                : "1 klik aja untuk hubungkan"}
            </div>
          </div>
        </div>
      </div>

      {!isLinked && (
        <div className="max-w-xl space-y-5">
          {/* One-click Connect */}
          {botUsername ? (
            <div className="neo-card p-6">
              <h2 className="font-heading text-xl font-bold mb-2">
                Hubungkan Akun
              </h2>
              <p className="text-sm mb-4" style={{ color: "#666" }}>
                Klik tombol di bawah → Telegram terbuka → tap <strong>Start</strong> → selesai!
              </p>
              <button
                onClick={handleConnect}
                disabled={loading || linking}
                className="neo-btn px-6 py-4 text-white font-bold flex items-center gap-3 w-full justify-center"
                style={{ background: "#FF3B30" }}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
                {loading
                  ? "Menyiapkan..."
                  : linking
                  ? "Menunggu konfirmasi dari Telegram..."
                  : "Hubungkan Telegram"}
                {!loading && !linking && <ExternalLink size={16} />}
              </button>

              {linking && (
                <div className="mt-4 p-4 neo-border flex items-center gap-3" style={{ background: "#FFFDE7" }}>
                  <Loader2 size={18} className="animate-spin" style={{ color: "#FF3B30" }} />
                  <div className="text-sm">
                    <strong>Menunggu...</strong> Buka Telegram dan tap <strong>Start</strong> di bot.
                    Halaman ini akan otomatis update.
                    <br />
                    <span style={{ color: "#999" }}>Telegram tidak terbuka? <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: "#FF3B30" }}>Klik di sini</a></span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="neo-card p-6">
              <h2 className="font-heading text-xl font-bold mb-2">
                Bot Belum Dikonfigurasi
              </h2>
              <p className="text-sm" style={{ color: "#666" }}>
                Admin perlu set <code className="font-mono text-xs px-1 py-0.5 neo-border" style={{ background: "#f4f4f4" }}>TELEGRAM_BOT_USERNAME</code> di environment.
              </p>
            </div>
          )}
        </div>
      )}

      {isLinked && (
        <div className="max-w-xl space-y-5">
          {/* Quick Actions */}
          {botUsername && (
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="neo-btn px-6 py-4 font-bold flex items-center gap-3 w-full justify-center text-center"
              style={{ background: "#00C781", color: "white", display: "flex" }}
            >
              <MessageCircle size={20} />
              Buka Bot di Telegram
              <ExternalLink size={16} />
            </a>
          )}

          {/* All Commands Guide */}
          <div className="neo-card p-6">
            <h2 className="font-heading text-lg font-bold mb-3">
              Semua Perintah Bot
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-heading font-bold uppercase tracking-wider mb-2" style={{ color: "#999" }}>Menu Utama</p>
                <div className="space-y-2 text-sm">
                  <CommandRow cmd="/start" desc="Buka menu catat — pilih pengeluaran atau pemasukan" />
                  <CommandRow cmd="/batal" desc="Batalkan input yang sedang berjalan" />
                </div>
              </div>
              <div>
                <p className="text-xs font-heading font-bold uppercase tracking-wider mb-2" style={{ color: "#999" }}>Lihat Keuangan</p>
                <div className="space-y-2 text-sm">
                  <CommandRow cmd="/saldo" desc="Ringkasan saldo & pengeluaran bulan ini" />
                  <CommandRow cmd="/laporan" desc="Laporan lengkap hari ini + bulan ini" />
                </div>
              </div>
              <div>
                <p className="text-xs font-heading font-bold uppercase tracking-wider mb-2" style={{ color: "#999" }}>Quick Add (1 pesan langsung jadi)</p>
                <div className="space-y-2 text-sm">
                  <CommandRow cmd="/catat 25000 kopi" desc="Catat pengeluaran instan" />
                  <CommandRow cmd="/masuk 5000000 gaji" desc="Catat pemasukan instan" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Demo */}
          <div className="neo-card p-6" style={{ background: "#121212", color: "white" }}>
            <h2 className="font-heading text-lg font-bold mb-3" style={{ color: "#FFCC00" }}>
              💡 Contoh Flow Lengkap
            </h2>
            <div className="space-y-2 text-sm font-mono">
              <div><span style={{ color: "#00C781" }}>Kamu:</span> /start</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> Mau nyatet apa nih bos? 📝</div>
              <div><span style={{ color: "#00C781" }}>Kamu:</span> tap 💸 Pengeluaran</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> Pilih kategorinya:</div>
              <div><span style={{ color: "#00C781" }}>Kamu:</span> tap Makan</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> Beli apa tuh?</div>
              <div><span style={{ color: "#00C781" }}>Kamu:</span> Kopi Susu</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> Berapa harganya?</div>
              <div><span style={{ color: "#00C781" }}>Kamu:</span> 25000</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> Kapan transaksinya?</div>
              <div><span style={{ color: "#00C781" }}>Kamu:</span> tap 🕒 Hari Ini</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> 📋 Cek dulu ya bos...</div>
              <div><span style={{ color: "#00C781" }}>Kamu:</span> tap ✅ Simpan</div>
              <div><span style={{ color: "#FFCC00" }}>Bot:</span> ✅ Gas! Udah dicatet bos!</div>
            </div>
          </div>

          {/* Tips */}
          <div className="neo-card p-5" style={{ background: "#FFFDE7" }}>
            <h3 className="font-heading text-sm font-bold mb-2">💡 Tips</h3>
            <ul className="space-y-1 text-xs" style={{ color: "#666" }}>
              <li>• Nominal bisa pakai titik: <strong>25.000</strong></li>
              <li>• Tanggal bisa DD/MM/YYYY atau DD-MM-YYYY</li>
              <li>• Quick add (<strong>/catat</strong>) otomatis masuk kategori &quot;Lainnya&quot;</li>
              <li>• Laporan otomatis dikirim setiap jam <strong>20:00 WIB</strong></li>
              <li>• Ketik <strong>/batal</strong> kapan saja untuk batalkan input</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CommandRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono font-bold flex-shrink-0" style={{ color: "#FF3B30" }}>
        {cmd}
      </span>
      <span>{desc}</span>
    </div>
  );
}
