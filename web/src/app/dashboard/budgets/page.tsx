"use client";

import { useEffect, useState } from "react";
import {
  budgets as budgetsApi,
  categories as categoriesApi,
  type BudgetItem,
  type CategoryItem2,
} from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { PiggyBank, Plus, Trash2, X } from "lucide-react";

export default function BudgetsPage() {
  const [budgetList, setBudgetList] = useState<BudgetItem[]>([]);
  const [categoryList, setCategoryList] = useState<CategoryItem2[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    try {
      const [budgetRes, catRes] = await Promise.all([
        budgetsApi.list(),
        categoriesApi.list("expense"),
      ]);
      setBudgetList(budgetRes.budgets || []);
      setCategoryList(catRes.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await budgetsApi.upsert(formCategory, parseInt(formAmount));
      setShowForm(false);
      setFormCategory("");
      setFormAmount("");
      setMessage("Budget berhasil disimpan!");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan budget");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await budgetsApi.delete(id);
      setDeleteConfirm(null);
      setMessage("Budget berhasil dihapus");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal hapus budget");
    }
  };

  // Clear messages after 3s
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const getPercentage = (spent: number, amount: number) => {
    if (amount <= 0) return 0;
    return Math.min((spent / amount) * 100, 100);
  };

  const getBarColor = (pct: number) => {
    if (pct >= 80) return "#FF3B30";
    if (pct >= 50) return "#FFCC00";
    return "#00C781";
  };

  const totalBudget = budgetList.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetList.reduce((s, b) => s + b.spent, 0);

  // Categories that don't have a budget yet
  const availableCategories = categoryList.filter(
    (c) => !budgetList.some((b) => b.category_name === c.name)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="font-heading text-xl font-bold animate-pulse">
          Loading...
        </div>
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
            <PiggyBank size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Anggaran
            </h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>
              Set batas pengeluaran per kategori — dapat peringatan kalau melebihi
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setError(null);
          }}
          className="neo-btn px-3 py-2 sm:px-5 sm:py-3 flex items-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm"
          style={{ background: "#00C781" }}
        >
          <Plus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
          Tambah Anggaran
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

      {/* Summary card */}
      {budgetList.length > 0 && (
        <div
          className="neo-border neo-shadow p-5 mb-6"
          style={{ background: "#FFFFFF" }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#666" }}>
                Total Anggaran
              </p>
              <p className="font-heading text-xl font-bold mt-1">
                {formatRupiah(totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#666" }}>
                Total Terpakai
              </p>
              <p
                className="font-heading text-xl font-bold mt-1"
                style={{
                  color: totalSpent > totalBudget ? "#FF3B30" : "#121212",
                }}
              >
                {formatRupiah(totalSpent)}
              </p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-4">
            <div
              className="w-full h-3 neo-border overflow-hidden"
              style={{ background: "#F0F0F0" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${getPercentage(totalSpent, totalBudget)}%`,
                  background: getBarColor(getPercentage(totalSpent, totalBudget)),
                }}
              />
            </div>
            <p className="text-xs mt-1 text-right font-heading font-bold" style={{ color: "#666" }}>
              {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% terpakai
            </p>
          </div>
        </div>
      )}

      {/* Budget list */}
      {budgetList.length === 0 ? (
        <div
          className="neo-border neo-shadow p-8 text-center"
          style={{ background: "#FFFFFF" }}
        >
          <PiggyBank size={48} className="mx-auto mb-3" style={{ color: "#CCC" }} />
          <p className="font-heading text-lg font-bold">Belum ada anggaran</p>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Tambah anggaran untuk mulai mengontrol pengeluaran.
            Kategori bisa ditambah di <strong>Settings → Custom Kategori</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetList.map((budget) => {
            const pct = getPercentage(budget.spent, budget.amount);
            const barColor = getBarColor(pct);
            const isOver = budget.spent > budget.amount;

            return (
              <div
                key={budget.id}
                className="neo-border neo-shadow p-4"
                style={{ background: "#FFFFFF" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wider">
                    {budget.category_name}
                  </h3>
                  {deleteConfirm === budget.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="neo-btn px-3 py-1 text-xs text-white"
                        style={{ background: "#FF3B30" }}
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="neo-btn px-3 py-1 text-xs"
                        style={{ background: "#F0F0F0" }}
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(budget.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Trash2 size={16} style={{ color: "#FF3B30" }} />
                    </button>
                  )}
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span
                    className="font-heading text-lg font-bold"
                    style={{ color: isOver ? "#FF3B30" : "#121212" }}
                  >
                    {formatRupiah(budget.spent)}
                  </span>
                  <span className="text-sm" style={{ color: "#666" }}>
                    / {formatRupiah(budget.amount)}
                  </span>
                </div>
                <div
                  className="w-full h-3 neo-border overflow-hidden"
                  style={{ background: "#F0F0F0" }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: barColor,
                    }}
                  />
                </div>
                <p
                  className="text-xs mt-1 text-right font-heading font-bold"
                  style={{ color: isOver ? "#FF3B30" : "#666" }}
                >
                  {isOver
                    ? `Melebihi ${Math.round(pct)}%!`
                    : `${Math.round(pct)}% terpakai`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div
            className="neo-border neo-shadow w-full max-w-md p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold">
                Tambah Anggaran
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Kategori
                </label>
                {availableCategories.length === 0 ? (
                  <p className="text-sm py-2" style={{ color: "#666" }}>
                    Semua kategori pengeluaran sudah memiliki anggaran
                  </p>
                ) : (
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                    required
                  >
                    <option value="">Pilih kategori...</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                  Batas Anggaran
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
                    placeholder="500000"
                    min="1"
                    required
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: "#999" }}>Batas maksimal pengeluaran untuk kategori ini per bulan</p>
              </div>
              {error && (
                <p className="text-xs font-bold" style={{ color: "#FF3B30" }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={formLoading || availableCategories.length === 0}
                className="w-full neo-btn px-5 py-3 text-white font-heading text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#00C781" }}
              >
                {formLoading ? "Menyimpan..." : "Simpan Anggaran"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
