import Link from "next/link";
import {
  Zap,
  Wallet,
  PieChart,
  Target,
  Repeat,
  BarChart3,
  Send,
  Receipt,
  FileDown,
  ArrowRight,
  CheckCircle2,
  Star,
  TrendingUp,
  Shield,
  Clock,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  color,
  title,
  desc,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="neo-card p-6 flex flex-col gap-3">
      <div
        className="w-12 h-12 neo-border flex items-center justify-center shrink-0"
        style={{ background: color }}
      >
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "#555" }}>
        {desc}
      </p>
    </div>
  );
}

function StepCard({
  num,
  title,
  desc,
  color,
}: {
  num: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className="w-12 h-12 neo-border neo-shadow flex items-center justify-center shrink-0 font-heading text-xl font-black"
        style={{ background: color }}
      >
        {num}
      </div>
      <div>
        <h3 className="font-heading text-lg font-bold mb-1">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#555" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-heading text-3xl md:text-4xl font-black">
        {value}
      </div>
      <div className="text-sm mt-1" style={{ color: "#555" }}>
        {label}
      </div>
    </div>
  );
}

export default function Home() {
  const features = [
    {
      icon: Send,
      color: "#00C781",
      title: "Bot Telegram",
      desc: "Catat pengeluaran langsung dari chat Telegram. Ketik aja, beres.",
    },
    {
      icon: Wallet,
      color: "#FFCC00",
      title: "Multi Dompet",
      desc: "Pisahin duit cash, bank, e-wallet. Semua rapi di satu tempat.",
    },
    {
      icon: PieChart,
      color: "#FF3B30",
      title: "Anggaran",
      desc: "Set budget per kategori. Biar tau kapan harus rem pengeluaran.",
    },
    {
      icon: Target,
      color: "#00C781",
      title: "Target Tabungan",
      desc: "Mau nabung buat liburan? HP baru? Track progress-nya di sini.",
    },
    {
      icon: Repeat,
      color: "#FFCC00",
      title: "Transaksi Berulang",
      desc: "Bayar kos, Netflix, Spotify? Auto-catat tiap bulan tanpa ribet.",
    },
    {
      icon: BarChart3,
      color: "#FF3B30",
      title: "Analitik",
      desc: "Grafik pengeluaran harian, mingguan, bulanan. Visual yang jelas.",
    },
    {
      icon: Receipt,
      color: "#00C781",
      title: "Upload Struk",
      desc: "Foto struk belanja, attach ke transaksi. Bukti aman tersimpan.",
    },
    {
      icon: FileDown,
      color: "#FFCC00",
      title: "Export CSV",
      desc: "Download semua data transaksi ke spreadsheet kapan aja.",
    },
    {
      icon: Shield,
      color: "#FF3B30",
      title: "Aman & Privat",
      desc: "Data keuangan kamu cuma bisa diakses sama kamu. Titik.",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b-3 border-base" style={{ background: "#FAFAFA" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-10 h-10 neo-border flex items-center justify-center"
              style={{ background: "#FFCC00" }}
            >
              <Zap size={20} strokeWidth={3} />
            </div>
            <span className="font-heading text-xl font-bold">GasCatet</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-heading text-sm font-bold px-4 py-2 hover:underline decoration-2 underline-offset-4"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="neo-btn px-5 py-2 text-sm text-white"
              style={{ background: "#FF3B30" }}
            >
              Coba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 neo-border px-4 py-2 mb-6 text-sm font-bold font-heading"
              style={{ background: "#FFCC00" }}
            >
              <Zap size={16} strokeWidth={3} />
              EARLY ACCESS — GRATIS SEMUA FITUR
            </div>

            <h1 className="font-heading text-5xl md:text-7xl font-black leading-[0.95] tracking-tight mb-6">
              Catat Keuangan,
              <br />
              <span style={{ color: "#FF3B30" }}>Sat-Set!</span> ⚡
            </h1>

            <p className="text-lg md:text-xl leading-relaxed mb-8 max-w-xl" style={{ color: "#444" }}>
              Bosen catat pengeluaran ribet? GasCatet bikin kamu bisa track
              keuangan <strong>langsung dari Telegram</strong>, kelola budget,
              dan liat analitik — semua dalam hitungan detik.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="neo-btn px-8 py-4 text-base text-white inline-flex items-center justify-center gap-2"
                style={{ background: "#FF3B30" }}
              >
                Mulai Sekarang
                <ArrowRight size={18} strokeWidth={3} />
              </Link>
              <a
                href="https://t.me/GasCatetBot"
                target="_blank"
                rel="noopener noreferrer"
                className="neo-btn px-8 py-4 text-base inline-flex items-center justify-center gap-2"
                style={{ background: "#00C781" }}
              >
                <Send size={18} strokeWidth={2.5} />
                Coba Bot Telegram
              </a>
            </div>
          </div>

          {/* Decorative elements */}
          <div
            className="hidden lg:block absolute top-20 right-12 w-64 h-64 neo-border rotate-6"
            style={{ background: "#FFCC00" }}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-base" />
                <span className="font-heading font-bold text-sm">Nasi Goreng -25rb</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-base" />
                <span className="font-heading font-bold text-sm">Kopi Susu -18rb</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-base" />
                <span className="font-heading font-bold text-sm">Bensin -50rb</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-base" />
                <span className="font-heading font-bold text-sm">Gaji +5jt</span>
              </div>
              <div className="mt-4 pt-4 border-t-3 border-base">
                <div className="font-heading font-black text-lg">Sisa: Rp4.907.000</div>
              </div>
            </div>
          </div>

          <div
            className="hidden lg:block absolute bottom-16 right-80 w-48 h-48 neo-border -rotate-3"
            style={{ background: "#FF3B30" }}
          >
            <div className="p-5 text-white">
              <TrendingUp size={32} strokeWidth={2.5} className="mb-3" />
              <div className="font-heading text-sm font-bold uppercase tracking-wider opacity-80">
                Pengeluaran Minggu Ini
              </div>
              <div className="font-heading text-2xl font-black mt-1">-Rp320k</div>
              <div className="text-xs mt-1 opacity-70">12% lebih hemat ✨</div>
            </div>
          </div>
        </div>

        {/* Zigzag divider */}
        <div className="w-full h-6 border-t-3 border-base" style={{ background: "#FFCC00" }} />
      </section>

      {/* Social proof */}
      <section style={{ background: "#121212", color: "white" }}>
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-wrap justify-center gap-12 md:gap-20">
          <StatBlock value="9+" label="Fitur Lengkap" />
          <StatBlock value="⚡" label="Catat < 5 detik" />
          <StatBlock value="🤖" label="Via Telegram" />
          <StatBlock value="🔒" label="Data Aman" />
        </div>
      </section>

      {/* Features */}
      <section className="border-t-3 border-base">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <div
              className="inline-block neo-border px-4 py-1 text-sm font-heading font-bold uppercase tracking-wider mb-4"
              style={{ background: "#00C781" }}
            >
              Fitur
            </div>
            <h2 className="font-heading text-3xl md:text-5xl font-black">
              Semua yang Kamu Butuhin,
              <br />
              <span style={{ color: "#FF3B30" }}>Udah Ada.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t-3 border-base" style={{ background: "#FFCC00" }}>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-5xl font-black">
              Gampang Banget, <span style={{ color: "#FF3B30" }}>3 Langkah</span> Doang
            </h2>
          </div>

          <div className="max-w-lg mx-auto space-y-8">
            <StepCard
              num="1"
              color="#FAFAFA"
              title="Daftar Gratis"
              desc="Bikin akun di web, hubungin sama Telegram kamu. Gak sampe 1 menit."
            />
            <StepCard
              num="2"
              color="#FAFAFA"
              title="Catat dari Mana Aja"
              desc="Mau dari web dashboard atau langsung chat di Telegram bot, terserah kamu."
            />
            <StepCard
              num="3"
              color="#FAFAFA"
              title="Pantau & Kontrol"
              desc="Liat grafik, cek budget, track target nabungan. Semua real-time."
            />
          </div>
        </div>
      </section>

      {/* Telegram section */}
      <section className="border-t-3 border-base">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className="inline-block neo-border px-4 py-1 text-sm font-heading font-bold uppercase tracking-wider mb-4"
                style={{ background: "#00C781" }}
              >
                <Send size={14} className="inline mr-1 -mt-0.5" /> Telegram Bot
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-black mb-4">
                Catat Langsung
                <br />
                dari <span style={{ color: "#FF3B30" }}>Chat Telegram</span>
              </h2>
              <p className="text-base leading-relaxed mb-6" style={{ color: "#444" }}>
                Gak perlu buka app. Tinggal chat bot, ketik transaksi kamu, selesai.
                Bot-nya ngerti bahasa manusia — ketik &quot;makan siang 25rb&quot; dan
                langsung tercatat.
              </p>

              {/* Chat mockup */}
              <div className="neo-card p-0 overflow-hidden max-w-sm">
                <div
                  className="px-4 py-3 font-heading font-bold text-sm border-b-3 border-base flex items-center gap-2"
                  style={{ background: "#00C781" }}
                >
                  <Send size={14} />
                  GasCatet Bot
                </div>
                <div className="p-4 space-y-3 text-sm" style={{ background: "#F5F5F5" }}>
                  <div className="flex justify-end">
                    <div className="neo-border px-3 py-2 max-w-[75%]" style={{ background: "#FFCC00" }}>
                      makan siang nasi padang 28rb
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="neo-border px-3 py-2 max-w-[75%]" style={{ background: "white" }}>
                      ✅ <strong>Tercatat!</strong>
                      <br />
                      📝 Makan siang nasi padang
                      <br />
                      💰 -Rp28.000
                      <br />
                      🏷️ Makanan
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="neo-border px-3 py-2 max-w-[75%]" style={{ background: "#FFCC00" }}>
                      /ringkasan
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="neo-border px-3 py-2 max-w-[75%]" style={{ background: "white" }}>
                      📊 <strong>Bulan Ini</strong>
                      <br />
                      Pemasukan: Rp5.000.000
                      <br />
                      Pengeluaran: Rp2.340.000
                      <br />
                      Sisa: <strong>Rp2.660.000</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-heading text-xl font-bold mb-6">
                Command yang Bisa Kamu Pake:
              </h3>
              {[
                { cmd: "/catat", desc: "Catat transaksi baru" },
                { cmd: "/ringkasan", desc: "Liat ringkasan bulan ini" },
                { cmd: "/hari_ini", desc: "Transaksi hari ini" },
                { cmd: "/dompet", desc: "Cek saldo semua dompet" },
                { cmd: "/kategori", desc: "Liat daftar kategori" },
                { cmd: "Ketik langsung", desc: '"kopi susu 18rb" — auto tercatat!' },
              ].map((item, i) => (
                <div key={i} className="neo-card p-4 flex items-center gap-4">
                  <code
                    className="font-mono text-sm font-bold px-2 py-1 neo-border shrink-0"
                    style={{ background: "#FFCC00" }}
                  >
                    {item.cmd}
                  </code>
                  <span className="text-sm">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Why */}
      <section className="border-t-3 border-base" style={{ background: "#121212", color: "white" }}>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-5xl font-black">
              Kenapa <span style={{ color: "#FFCC00" }}>GasCatet</span>?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                color: "#FF3B30",
                title: "Cepet Banget",
                desc: "5 detik buat catat dari Telegram. Gak perlu buka app, gak perlu login ulang.",
              },
              {
                icon: Star,
                color: "#FFCC00",
                title: "Gratis Saat Ini",
                desc: "Lagi masa early access — semua fitur bisa kamu pake gratis. Buruan cobain!",
              },
              {
                icon: TrendingUp,
                color: "#00C781",
                title: "Bikin Kamu Melek Duit",
                desc: "Grafik & analitik yang bikin kamu sadar kemana aja duit pergi tiap bulan.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 border-3 border-white/20"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-12 h-12 neo-border flex items-center justify-center mb-4"
                  style={{ background: item.color }}
                >
                  <item.icon size={22} strokeWidth={2.5} className="text-base" style={{ color: "#121212" }} />
                </div>
                <h3 className="font-heading text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t-3 border-base" style={{ background: "#FF3B30" }}>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center text-white">
          <h2 className="font-heading text-3xl md:text-5xl font-black mb-4">
            Udah Siap Kontrol Keuangan?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-lg mx-auto">
            Jangan cuma scroll. Daftar sekarang, catat pengeluaran pertama kamu,
            dan rasain bedanya.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="neo-btn px-10 py-4 text-base inline-flex items-center justify-center gap-2"
              style={{ background: "#FFCC00", color: "#121212" }}
            >
              Cobain Gratis Sekarang
              <ArrowRight size={18} strokeWidth={3} />
            </Link>
            <Link
              href="/login"
              className="neo-btn px-10 py-4 text-base inline-flex items-center justify-center gap-2"
              style={{ background: "white", color: "#121212" }}
            >
              Udah Punya Akun? Masuk
            </Link>
          </div>
          <p className="text-sm mt-6 opacity-70">🚀 Masa early access — semua fitur gratis, feedback kamu sangat berarti!</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-base">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 neo-border flex items-center justify-center"
              style={{ background: "#FFCC00" }}
            >
              <Zap size={14} strokeWidth={3} />
            </div>
            <span className="font-heading text-sm font-bold">GasCatet</span>
            <span className="text-sm" style={{ color: "#888" }}>
              — Catat keuangan, sat-set! ⚡
            </span>
          </div>
          <div className="text-sm" style={{ color: "#888" }}>
            © 2026 GasCatet. Made with ❤️ and ☕
          </div>
        </div>
      </footer>
    </div>
  );
}
