"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminRecentTx } from "@/lib/api";
import { Receipt, Search, RefreshCw, Filter } from "lucide-react";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminRecentTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  const fetchData = async () => {
    const d = await adminApi.transactions();
    setTransactions(d.transactions);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-heading text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  const filtered = transactions.filter((tx) => {
    const matchType = typeFilter === "ALL" || tx.transaction_type === typeFilter;
    const matchSearch =
      !search ||
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_email.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalIncome = filtered
    .filter((t) => t.transaction_type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.transaction_type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Receipt size={24} strokeWidth={2.5} />
            Semua Transaksi
          </h1>
          <p className="text-sm" style={{ color: "#666" }}>
            {filtered.length} transaksi ditampilkan
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 neo-border neo-shadow font-heading text-xs font-bold uppercase tracking-wider transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
          style={{ background: "#FFCC00" }}
        >
          <RefreshCw size={14} strokeWidth={3} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="neo-border neo-shadow p-4" style={{ background: "#C8E6C9" }}>
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Total Masuk
          </p>
          <p className="font-heading text-lg font-bold" style={{ color: "#2E7D32" }}>
            {formatRupiah(totalIncome)}
          </p>
        </div>
        <div className="neo-border neo-shadow p-4" style={{ background: "#FFCDD2" }}>
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Total Keluar
          </p>
          <p className="font-heading text-lg font-bold" style={{ color: "#C62828" }}>
            {formatRupiah(totalExpense)}
          </p>
        </div>
        <div className="neo-border neo-shadow p-4 col-span-2 lg:col-span-1" style={{ background: "#FFCC00" }}>
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Selisih
          </p>
          <p className="font-heading text-lg font-bold">
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            strokeWidth={2.5}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#999" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-3 neo-border font-heading text-sm font-bold focus:outline-none"
            style={{ background: "#FFFFFF" }}
            placeholder="Cari deskripsi, kategori, nama..."
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={14} strokeWidth={2.5} style={{ color: "#666" }} />
          {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 neo-border font-heading text-xs font-bold uppercase tracking-wider transition-all ${
                typeFilter === t ? "neo-shadow text-white" : ""
              }`}
              style={{
                background:
                  typeFilter === t
                    ? t === "INCOME"
                      ? "#2E7D32"
                      : t === "EXPENSE"
                      ? "#C62828"
                      : "#121212"
                    : "#FFFFFF",
              }}
            >
              {t === "ALL" ? "Semua" : t === "INCOME" ? "Masuk" : "Keluar"}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions list */}
      <div className="space-y-2">
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="neo-border p-4 flex items-center justify-between gap-3"
            style={{ background: "#FFFFFF" }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="neo-border px-2 py-0.5 text-[10px] font-heading font-bold uppercase text-white"
                  style={{
                    background: tx.transaction_type === "INCOME" ? "#2E7D32" : "#C62828",
                  }}
                >
                  {tx.transaction_type === "INCOME" ? "Masuk" : "Keluar"}
                </span>
                <span className="text-xs font-heading font-bold" style={{ color: "#666" }}>
                  {tx.category}
                </span>
              </div>
              <p className="font-heading text-sm font-bold truncate">
                {tx.description || tx.category}
              </p>
              <p className="text-xs" style={{ color: "#666" }}>
                {tx.user_name} &middot; {tx.transaction_date}
              </p>
            </div>
            <span
              className="font-heading text-base font-bold whitespace-nowrap"
              style={{
                color: tx.transaction_type === "INCOME" ? "#2E7D32" : "#C62828",
              }}
            >
              {tx.transaction_type === "INCOME" ? "+" : "-"}
              {formatRupiah(tx.amount)}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="neo-border p-8 text-center" style={{ background: "#FFFFFF" }}>
            <p className="text-sm font-heading" style={{ color: "#999" }}>
              {search || typeFilter !== "ALL" ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
