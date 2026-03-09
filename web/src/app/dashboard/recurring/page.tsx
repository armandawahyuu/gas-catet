"use client";

import { useEffect, useState } from "react";
import {
  recurringTx,
  categories as categoriesApi,
  wallets as walletsApi,
  type RecurringItem,
  type CategoryItem2,
  type WalletItem,
} from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { RefreshCw, Plus, Trash2, X, Pause, Play } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UpgradePrompt } from "@/components/UpgradePrompt";

const FREQ_LABELS: Record<string, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

export default function RecurringPage() {
  const { isPro } = useAuth();
  const [list, setList] = useState<RecurringItem[]>([]);
  const [categoryList, setCategoryList] = useState<CategoryItem2[]>([]);
  const [walletList, setWalletList] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form
  const [formType, setFormType] = useState("EXPENSE");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formWallet, setFormWallet] = useState("");
  const [formFreq, setFormFreq] = useState("monthly");
  const [formNextRun, setFormNextRun] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    try {
      const [recRes, catRes, walRes] = await Promise.all([
        recurringTx.list(),
        categoriesApi.list(),
        walletsApi.list(),
      ]);
      setList(recRes.recurring || []);
      setCategoryList(catRes.categories || []);
      setWalletList(walRes.wallets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const resetForm = () => {
    setFormType("EXPENSE");
    setFormAmount("");
    setFormDesc("");
    setFormCategory("");
    setFormWallet("");
    setFormFreq("monthly");
    setFormNextRun("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await recurringTx.create({
        amount: parseInt(formAmount),
        transaction_type: formType,
        description: formDesc,
        category: formCategory,
        wallet_id: formWallet,
        frequency: formFreq,
        next_run: formNextRun,
      });
      setShowForm(false);
      resetForm();
      setMessage("Transaksi berulang berhasil ditambahkan!");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await recurringTx.toggle(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal toggle");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await recurringTx.delete(id);
      setDeleteConfirm(null);
      setMessage("Berhasil dihapus");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal hapus");
    }
  };

  const filteredCategories = categoryList.filter(
    (c) => c.type === formType
  );

  if (!isPro) {
    return <UpgradePrompt feature="Transaksi Berulang" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="font-heading text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 neo-border flex items-center justify-center"
            style={{ background: "#FFCC00" }}
          >
            <RefreshCw size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Berulang
            </h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>
              Transaksi yang otomatis dicatat sesuai jadwal — saldo dompet otomatis berubah saat waktunya tiba
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
            setError(null);
          }}
          className="neo-btn px-3 py-2 sm:px-5 sm:py-3 flex items-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm"
          style={{ background: "#00C781" }}
        >
          <Plus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
          Tambah Berulang
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className="neo-border p-3 mb-4 font-heading text-sm font-bold"
          style={{ background: "#00C781", color: "white" }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="neo-border p-3 mb-4 font-heading text-sm font-bold"
          style={{ background: "#FF3B30", color: "white" }}
        >
          {error}
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div
          className="neo-border neo-shadow p-8 text-center"
          style={{ background: "#FFFFFF" }}
        >
          <RefreshCw size={48} className="mx-auto mb-3" style={{ color: "#CCC" }} />
          <p className="font-heading text-lg font-bold">Belum ada transaksi berulang</p>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Cocok untuk tagihan rutin seperti listrik, internet, atau gaji bulanan.
            Sistem otomatis mencatat dan mengubah saldo dompet sesuai jadwal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div
              key={item.id}
              className={`neo-border neo-shadow p-4 ${!item.is_active ? "opacity-50" : ""}`}
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-heading font-bold uppercase px-2 py-0.5 neo-border"
                      style={{
                        background: item.transaction_type === "INCOME" ? "#00C781" : "#FF3B30",
                        color: "white",
                      }}
                    >
                      {item.transaction_type === "INCOME" ? "Masuk" : "Keluar"}
                    </span>
                    <span
                      className="text-xs font-heading font-bold uppercase px-2 py-0.5 neo-border"
                      style={{ background: "#FFCC00" }}
                    >
                      {FREQ_LABELS[item.frequency] || item.frequency}
                    </span>
                    {!item.is_active && (
                      <span className="text-xs font-heading font-bold uppercase px-2 py-0.5 neo-border bg-gray-200">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="font-heading text-sm font-bold truncate">
                    {item.description || item.category}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#666" }}>
                    <span>{item.category}</span>
                    {item.wallet_name && <span>• {item.wallet_name}</span>}
                    <span>• Berikutnya: {item.next_run}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="font-heading text-lg font-bold"
                    style={{
                      color: item.transaction_type === "INCOME" ? "#00C781" : "#FF3B30",
                    }}
                  >
                    {item.transaction_type === "INCOME" ? "+" : "-"}
                    {formatRupiah(item.amount)}
                  </p>
                  <div className="flex items-center gap-1 mt-2 justify-end">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors group relative"
                      title={item.is_active ? "Pause — hentikan sementara tanpa menghapus" : "Aktifkan kembali"}
                    >
                      {item.is_active ? (
                        <Pause size={16} style={{ color: "#FFCC00" }} />
                      ) : (
                        <Play size={16} style={{ color: "#00C781" }} />
                      )}
                    </button>
                    {deleteConfirm === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="neo-btn px-2 py-1 text-xs text-white"
                          style={{ background: "#FF3B30" }}
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="neo-btn px-2 py-1 text-xs"
                          style={{ background: "#F0F0F0" }}
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Trash2 size={16} style={{ color: "#FF3B30" }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div
            className="neo-border neo-shadow w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold">
                Tambah Transaksi Berulang
              </h2>
              <p className="text-xs mt-1 mb-2" style={{ color: "#666" }}>
                Transaksi akan otomatis tercatat sesuai frekuensi yang kamu pilih
              </p>
              <button onClick={() => setShowForm(false)}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Tipe
                </label>
                <div className="flex gap-2">
                  {(["EXPENSE", "INCOME"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setFormType(t);
                        setFormCategory("");
                      }}
                      className={`flex-1 neo-btn px-3 py-2 text-xs font-heading font-bold uppercase ${
                        formType === t ? "text-white" : ""
                      }`}
                      style={{
                        background:
                          formType === t
                            ? t === "EXPENSE"
                              ? "#FF3B30"
                              : "#00C781"
                            : "#F0F0F0",
                      }}
                    >
                      {t === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Nominal
                </label>
                <div className="flex items-center neo-border overflow-hidden">
                  <span
                    className="px-3 py-2 font-heading text-sm font-bold"
                    style={{ background: "#F0F0F0", borderRight: "3px solid #121212" }}
                  >
                    Rp
                  </span>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="flex-1 px-3 py-2 font-heading text-sm focus:outline-none"
                    placeholder="100000"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                  placeholder="Bayar listrik bulanan"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                  required
                >
                  <option value="">Pilih kategori...</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wallet */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Dompet
                </label>
                <select
                  value={formWallet}
                  onChange={(e) => setFormWallet(e.target.value)}
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                >
                  <option value="">Tanpa dompet</option>
                  {walletList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Frekuensi
                </label>
                <select
                  value={formFreq}
                  onChange={(e) => setFormFreq(e.target.value)}
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                  required
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                  <option value="yearly">Tahunan</option>
                </select>
              </div>

              {/* Next Run */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Mulai Tanggal
                </label>
                <input
                  type="date"
                  value={formNextRun}
                  onChange={(e) => setFormNextRun(e.target.value)}
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                  required
                />
                <p className="text-xs mt-1" style={{ color: "#999" }}>Pencatatan otomatis dimulai dari tanggal ini</p>
              </div>

              {error && (
                <p className="text-xs font-bold" style={{ color: "#FF3B30" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full neo-btn px-5 py-3 text-white font-heading text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#00C781" }}
              >
                {formLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
