"use client";

import { useEffect, useState, useCallback } from "react";
import {
  transactions as txApi,
  categories as categoriesApi,
  wallets as walletsApi,
  type CategoryItem2,
  type Transaction,
  type WalletItem,
} from "@/lib/api";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  X,
  Filter,
} from "lucide-react";

type TxType = "" | "INCOME" | "EXPENSE";

export default function TransactionsPage() {
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TxType>("");
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadTx = useCallback(async () => {
    try {
      const res = await txApi.list({
        type: filter || undefined,
        limit: 50,
      });
      setTxList(res.transactions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadTx();
  }, [loadTx]);

  const handleDelete = async (id: string) => {
    try {
      await txApi.delete(id);
      setDeleteConfirm(null);
      loadTx();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Transaksi
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Kelola semua catatan keuangan kamu
          </p>
        </div>
        <button
          onClick={() => {
            setEditTx(null);
            setShowForm(true);
          }}
          className="neo-btn px-5 py-3 flex items-center gap-2 text-white text-sm"
          style={{ background: "#00C781" }}
        >
          <Plus size={18} strokeWidth={3} />
          Tambah
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        <FilterBtn
          label="Semua"
          active={filter === ""}
          onClick={() => setFilter("")}
        />
        <FilterBtn
          label="Pengeluaran"
          active={filter === "EXPENSE"}
          onClick={() => setFilter("EXPENSE")}
          color="#FF3B30"
        />
        <FilterBtn
          label="Pemasukan"
          active={filter === "INCOME"}
          onClick={() => setFilter("INCOME")}
          color="#00C781"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="font-heading text-lg font-bold animate-pulse">
            Memuat...
          </div>
        </div>
      ) : txList.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <Filter size={48} className="mx-auto mb-4" style={{ color: "#CCC" }} />
          <div className="font-heading text-lg font-bold mb-2">
            Belum ada transaksi
          </div>
          <p className="text-sm" style={{ color: "#666" }}>
            Klik tombol Tambah untuk mulai catat!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {txList.map((tx) => (
            <div key={tx.id} className="neo-card p-4 flex items-center gap-4">
              <div
                className="w-11 h-11 flex items-center justify-center neo-border flex-shrink-0"
                style={{
                  background:
                    tx.transaction_type === "INCOME" ? "#00C781" : "#FF3B30",
                }}
              >
                {tx.transaction_type === "INCOME" ? (
                  <ArrowUpRight size={20} color="white" strokeWidth={3} />
                ) : (
                  <ArrowDownRight size={20} color="white" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{tx.description}</div>
                <div className="text-xs" style={{ color: "#999" }}>
                  {formatDate(tx.transaction_date)} · {tx.category || "Lainnya"}
                  {tx.wallet_name ? ` · ${tx.wallet_name}` : ""} ·{" "}
                  {tx.transaction_type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                </div>
              </div>
              <div
                className="font-mono text-lg font-bold whitespace-nowrap"
                style={{
                  color:
                    tx.transaction_type === "INCOME" ? "#00C781" : "#FF3B30",
                }}
              >
                {tx.transaction_type === "INCOME" ? "+" : "-"}
                {formatRupiah(tx.amount)}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditTx(tx);
                    setShowForm(true);
                  }}
                  className="p-2 hover:bg-gray-100 transition-colors"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(tx.id)}
                  className="p-2 hover:bg-gray-100 transition-colors"
                  style={{ color: "#FF3B30" }}
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TransactionForm
          initial={editTx}
          onClose={() => {
            setShowForm(false);
            setEditTx(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditTx(null);
            loadTx();
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="neo-card p-6 w-full max-w-sm">
            <h3 className="font-heading text-lg font-bold mb-3">
              Hapus Transaksi?
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666" }}>
              Data yang dihapus nggak bisa dikembaliin lho bos.
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

function FilterBtn({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`neo-btn px-4 py-2 text-xs ${active ? "text-white" : ""}`}
      style={{
        background: active ? color || "#121212" : "#FFFFFF",
      }}
    >
      {label}
    </button>
  );
}

function TransactionForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initial?.transaction_type || "EXPENSE"
  );
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "Lainnya");
  const [amount, setAmount] = useState(
    initial?.amount ? initial.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
  );
  const formatAmount = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const [date, setDate] = useState(
    initial?.transaction_date || new Date().toISOString().split("T")[0]
  );
  const [walletId, setWalletId] = useState(initial?.wallet_id || "");
  const [walletOptions, setWalletOptions] = useState<WalletItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryItem2[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadWallets = async () => {
      try {
        const res = await walletsApi.list();
        setWalletOptions(res.wallets || []);
      } catch {
        setWalletOptions([]);
      }
    };
    loadWallets();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoriesApi.list(type);
        const items = res.categories || [];
        setCategoryOptions(items);
        if (items.length > 0 && !items.find((item) => item.name === category)) {
          setCategory(items[0].name);
        }
      } catch {
        setCategoryOptions([]);
      }
    };

    loadCategories();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount <= 0) {
      setError("Nominal harus lebih dari 0");
      return;
    }
    setSaving(true);
    try {
      const data = {
        amount: numAmount,
        transaction_type: type,
        description,
        category,
        transaction_date: date,
        wallet_id: walletId || undefined,
      };
      if (isEdit && initial) {
        await txApi.update(initial.id, data);
      } else {
        await txApi.create(data);
      }
      onSaved();
    } catch (err: unknown) {
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
            {isEdit ? "Edit Transaksi" : "Tambah Transaksi"}
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
          {/* Type toggle */}
          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Tipe
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`neo-btn flex-1 py-2 text-xs ${
                  type === "EXPENSE" ? "text-white" : ""
                }`}
                style={{
                  background: type === "EXPENSE" ? "#FF3B30" : "#FFFFFF",
                }}
              >
                💸 Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`neo-btn flex-1 py-2 text-xs ${
                  type === "INCOME" ? "text-white" : ""
                }`}
                style={{
                  background: type === "INCOME" ? "#00C781" : "#FFFFFF",
                }}
              >
                💰 Pemasukan
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Kategori
            </label>
            <div className="flex flex-wrap gap-2">
              {(categoryOptions.length > 0
                ? categoryOptions.map((item) => item.name)
                : ["Lainnya"]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`neo-btn px-3 py-1.5 text-xs ${category === cat ? "text-white" : ""}`}
                  style={{
                    background: category === cat ? (type === "EXPENSE" ? "#FF3B30" : "#00C781") : "#FFFFFF",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Deskripsi
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="neo-input w-full px-4 py-3 text-sm"
              placeholder="Beli apa / Dapet dari mana"
              required
            />
          </div>

          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Nominal
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) =>
                  setAmount(formatAmount(e.target.value))
                }
                className="neo-input w-full pl-12 pr-4 py-3 text-sm font-mono"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="neo-input w-full px-4 py-3 text-sm"
              required
            />
          </div>

          {/* Wallet */}
          {walletOptions.length > 0 && (
            <div>
              <label className="block font-heading text-xs font-bold mb-2 uppercase tracking-wider">
                Dompet
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setWalletId("")}
                  className={`neo-btn px-3 py-1.5 text-xs ${!walletId ? "text-white" : ""}`}
                  style={{ background: !walletId ? "#121212" : "#FFFFFF" }}
                >
                  Tanpa Dompet
                </button>
                {walletOptions.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWalletId(w.id)}
                    className={`neo-btn px-3 py-1.5 text-xs ${walletId === w.id ? "text-white" : ""}`}
                    style={{ background: walletId === w.id ? "#FFCC00" : "#FFFFFF", color: walletId === w.id ? "#121212" : undefined }}
                  >
                    {w.icon} {w.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="neo-btn w-full py-3 text-sm text-white"
            style={{ background: type === "INCOME" ? "#00C781" : "#FF3B30" }}
          >
            {saving
              ? "Menyimpan..."
              : isEdit
              ? "Update Transaksi"
              : "Gas Catet! 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}
