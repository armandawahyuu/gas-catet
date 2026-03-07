"use client";

import { useEffect, useState } from "react";
import { wallets as walletsApi, type WalletItem } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { Wallet, Plus, Pencil, Trash2, X, DollarSign } from "lucide-react";

const ICON_OPTIONS = ["💵", "🏦", "📱", "💳", "🪙", "💰", "🏧", "💎"];

export default function WalletsPage() {
  const [walletList, setWalletList] = useState<WalletItem[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWallet, setEditWallet] = useState<WalletItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [balanceWallet, setBalanceWallet] = useState<WalletItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadWallets = async () => {
    try {
      const res = await walletsApi.list();
      setWalletList(res.wallets || []);
      setTotalBalance(res.total_balance || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await walletsApi.delete(id);
      setDeleteConfirm(null);
      setMessage("Dompet berhasil dihapus");
      loadWallets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal hapus dompet");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 neo-border flex items-center justify-center"
            style={{ background: "#FFCC00" }}
          >
            <Wallet size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Dompet
            </h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>
              Kelola dompet dan pantau saldo kamu
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditWallet(null);
            setShowForm(true);
          }}
          className="neo-btn px-5 py-3 flex items-center gap-2 text-white text-sm"
          style={{ background: "#00C781" }}
        >
          <Plus size={18} strokeWidth={3} />
          Tambah Dompet
        </button>
      </div>

      {message && (
        <div className="neo-border p-4 font-medium mb-4" style={{ background: "#C7F9CC" }}>
          {message}
        </div>
      )}
      {error && (
        <div className="neo-border p-4 font-medium mb-4" style={{ background: "#FFD6D6" }}>
          {error}
        </div>
      )}

      {/* Total Balance Card */}
      <div className="neo-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-heading text-xs font-bold uppercase tracking-wider"
            style={{ color: "#666" }}
          >
            Total Saldo
          </span>
          <div
            className="w-10 h-10 flex items-center justify-center neo-border"
            style={{ background: "#FFCC00" }}
          >
            <Wallet size={20} strokeWidth={2.5} />
          </div>
        </div>
        <div className="font-mono text-3xl font-bold">
          {formatRupiah(totalBalance)}
        </div>
      </div>

      {/* Wallet List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="font-heading text-lg font-bold animate-pulse">
            Memuat...
          </div>
        </div>
      ) : walletList.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <Wallet size={48} className="mx-auto mb-4" style={{ color: "#CCC" }} />
          <div className="font-heading text-lg font-bold mb-2">
            Belum ada dompet
          </div>
          <p className="text-sm" style={{ color: "#666" }}>
            Klik tombol Tambah Dompet untuk mulai!
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {walletList.map((w) => (
            <div key={w.id} className="neo-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 flex items-center justify-center neo-border text-2xl"
                    style={{ background: "#FAFAFA" }}
                  >
                    {w.icon}
                  </div>
                  <div className="font-heading text-lg font-bold">
                    {w.name}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setBalanceWallet(w)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ color: "#00C781" }}
                    title="Atur Saldo"
                  >
                    <DollarSign size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditWallet(w);
                      setShowForm(true);
                    }}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(w.id)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ color: "#FF3B30" }}
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: w.balance >= 0 ? "#00C781" : "#FF3B30" }}
              >
                {formatRupiah(w.balance)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <WalletForm
          initial={editWallet}
          onClose={() => {
            setShowForm(false);
            setEditWallet(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditWallet(null);
            setMessage(editWallet ? "Dompet berhasil diupdate" : "Dompet berhasil ditambah");
            loadWallets();
          }}
        />
      )}

      {/* Balance Modal */}
      {balanceWallet && (
        <BalanceForm
          wallet={balanceWallet}
          onClose={() => setBalanceWallet(null)}
          onSaved={() => {
            setBalanceWallet(null);
            setMessage("Saldo berhasil diatur");
            loadWallets();
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="neo-card p-6 w-full max-w-sm">
            <h3 className="font-heading text-lg font-bold mb-3">
              Hapus Dompet?
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666" }}>
              Dompet akan dihapus tapi transaksi tetap aman.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="neo-btn flex-1 py-2 px-4 text-sm"
                style={{ background: "#FAFAFA" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="neo-btn flex-1 py-2 px-4 text-sm text-white"
                style={{ background: "#FF3B30" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: WalletItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState(initial?.icon || "💰");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama dompet wajib diisi");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit && initial) {
        await walletsApi.update(initial.id, name.trim(), icon);
      } else {
        await walletsApi.create(name.trim(), icon);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="neo-card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-xl font-bold">
            {isEdit ? "Edit Dompet" : "Tambah Dompet"}
          </h3>
          <button onClick={onClose} className="p-1 hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            className="neo-border p-3 mb-4 text-sm font-medium"
            style={{ background: "#FF3B30", color: "white" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-12 h-12 neo-border text-2xl flex items-center justify-center ${
                    icon === ic ? "neo-shadow" : ""
                  }`}
                  style={{
                    background: icon === ic ? "#FFCC00" : "#FAFAFA",
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Nama Dompet
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="neo-input w-full px-4 py-3 text-sm"
              placeholder="Contoh: Cash, BRI, GoPay"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="neo-btn w-full py-3 text-sm text-white"
            style={{ background: "#00C781" }}
          >
            {saving
              ? "Menyimpan..."
              : isEdit
              ? "Update Dompet"
              : "Tambah Dompet"}
          </button>
        </form>
      </div>
    </div>
  );
}

function BalanceForm({
  wallet,
  onClose,
  onSaved,
}: {
  wallet: WalletItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(wallet.balance.toString());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (isNaN(numAmount) || numAmount < 0) {
      setError("Nominal tidak valid");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await walletsApi.setBalance(wallet.id, numAmount);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal atur saldo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="neo-card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-xl font-bold">
            Atur Saldo — {wallet.icon} {wallet.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            className="neo-border p-3 mb-4 text-sm font-medium"
            style={{ background: "#FF3B30", color: "white" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Saldo Saat Ini
            </label>
            <div className="font-mono text-lg font-bold mb-3" style={{ color: "#666" }}>
              {formatRupiah(wallet.balance)}
            </div>
          </div>
          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Saldo Baru
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-sm">
                Rp
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="neo-input w-full pl-12 pr-4 py-3 text-sm font-mono"
                placeholder="0"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="neo-btn w-full py-3 text-sm text-white"
            style={{ background: "#00C781" }}
          >
            {saving ? "Menyimpan..." : "Simpan Saldo"}
          </button>
        </form>
      </div>
    </div>
  );
}
