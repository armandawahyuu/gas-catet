"use client";

import { useEffect, useState } from "react";
import {
  budgets as budgetsApi,
  categories as categoriesApi,
  type BudgetItem,
  type CategoryItem2,
} from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { PiggyBank, Plus, Trash2, X, Sparkles, Check } from "lucide-react";

// === BUDGET TEMPLATES ===
type TemplateItem = { category: string; pct: number };
type Template = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  color: string;
  items: TemplateItem[];
};

const BUDGET_TEMPLATES: Template[] = [
  {
    id: "503020",
    name: "50/30/20",
    emoji: "⚖️",
    desc: "Aturan klasik: 50% kebutuhan, 30% keinginan, 20% tabungan",
    color: "#00C781",
    items: [
      { category: "Makan", pct: 20 },
      { category: "Rumah", pct: 20 },
      { category: "Transport", pct: 10 },
      { category: "Belanja", pct: 15 },
      { category: "Hiburan", pct: 10 },
      { category: "Kesehatan", pct: 5 },
      { category: "Pendidikan", pct: 5 },
      { category: "Lainnya", pct: 15 },
    ],
  },
  {
    id: "hemat",
    name: "Hemat",
    emoji: "💪",
    desc: "Lebih ketat: 60% kebutuhan pokok, 20% keinginan, 20% tabungan",
    color: "#FFCC00",
    items: [
      { category: "Makan", pct: 25 },
      { category: "Rumah", pct: 25 },
      { category: "Transport", pct: 10 },
      { category: "Belanja", pct: 10 },
      { category: "Hiburan", pct: 5 },
      { category: "Kesehatan", pct: 5 },
      { category: "Pendidikan", pct: 5 },
      { category: "Lainnya", pct: 15 },
    ],
  },
  {
    id: "mahasiswa",
    name: "Mahasiswa",
    emoji: "🎓",
    desc: "Budget terbatas — fokus makan, transport, dan pendidikan",
    color: "#FF3B30",
    items: [
      { category: "Makan", pct: 35 },
      { category: "Transport", pct: 15 },
      { category: "Pendidikan", pct: 15 },
      { category: "Hiburan", pct: 10 },
      { category: "Belanja", pct: 10 },
      { category: "Kesehatan", pct: 5 },
      { category: "Lainnya", pct: 10 },
    ],
  },
  {
    id: "darurat",
    name: "Dana Darurat",
    emoji: "🛡️",
    desc: "Prioritas bangun dana darurat — pengeluaran ditekan cuma 70%, sisanya tabung",
    color: "#3B82F6",
    items: [
      { category: "Makan", pct: 25 },
      { category: "Rumah", pct: 20 },
      { category: "Transport", pct: 10 },
      { category: "Kesehatan", pct: 5 },
      { category: "Belanja", pct: 5 },
      { category: "Lainnya", pct: 5 },
    ],
  },
];

export default function BudgetsPage() {
  const [budgetList, setBudgetList] = useState<BudgetItem[]>([]);
  const [categoryList, setCategoryList] = useState<CategoryItem2[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Template state
  const [showTemplate, setShowTemplate] = useState(false);
  const [templateStep, setTemplateStep] = useState<1 | 2>(1); // 1=pick, 2=preview
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateIncome, setTemplateIncome] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);

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

  // Template: get preview items matched to user's categories
  const getTemplatePreview = (template: Template, income: number) => {
    const catNames = categoryList.map((c) => c.name);
    return template.items
      .filter((item) => catNames.includes(item.category))
      .map((item) => ({
        category: item.category,
        pct: item.pct,
        amount: Math.round((income * item.pct) / 100),
      }));
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !templateIncome) return;
    const income = parseInt(templateIncome.replace(/\D/g, ""));
    if (!income || income <= 0) return;

    setTemplateLoading(true);
    setError(null);
    try {
      const preview = getTemplatePreview(selectedTemplate, income);
      for (const item of preview) {
        await budgetsApi.upsert(item.category, item.amount);
      }
      setShowTemplate(false);
      setSelectedTemplate(null);
      setTemplateIncome("");
      setTemplateStep(1);
      setMessage(`Template "${selectedTemplate.name}" berhasil diterapkan!`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menerapkan template");
    } finally {
      setTemplateLoading(false);
    }
  };

  const formatInputNumber = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowTemplate(true);
              setTemplateStep(1);
              setSelectedTemplate(null);
              setTemplateIncome("");
              setError(null);
            }}
            className="neo-btn px-3 py-2 sm:px-5 sm:py-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            style={{ background: "#FFCC00", color: "#121212" }}
          >
            <Sparkles size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
            Pakai Template
          </button>
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
          <p className="text-sm mt-1 mb-4" style={{ color: "#666" }}>
            Bingung mulai dari mana? Coba pakai template rekomendasi kami!
          </p>
          <button
            onClick={() => {
              setShowTemplate(true);
              setTemplateStep(1);
              setSelectedTemplate(null);
              setTemplateIncome("");
              setError(null);
            }}
            className="neo-btn px-5 py-3 font-heading text-sm font-bold inline-flex items-center gap-2"
            style={{ background: "#FFCC00" }}
          >
            <Sparkles size={16} strokeWidth={3} />
            Pakai Template Anggaran
          </button>
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

      {/* Template Modal */}
      {showTemplate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div
            className="neo-border neo-shadow w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} style={{ color: "#FFCC00" }} />
                <h2 className="font-heading text-xl font-bold">
                  {templateStep === 1 ? "Pilih Template Anggaran" : "Preview Anggaran"}
                </h2>
              </div>
              <button onClick={() => setShowTemplate(false)}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {templateStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "#666" }}>
                  Bingung mau anggarkan berapa? Pilih template di bawah, masukkan penghasilan bulanan, dan sistem otomatis hitungin buat kamu.
                </p>

                {/* Income input */}
                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1">
                    Penghasilan Bulanan
                  </label>
                  <div className="flex items-center neo-border overflow-hidden">
                    <span
                      className="px-3 py-2 font-heading text-sm font-bold"
                      style={{ background: "#F0F0F0", borderRight: "3px solid #121212" }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={templateIncome ? formatInputNumber(templateIncome) : ""}
                      onChange={(e) => setTemplateIncome(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 px-3 py-2 font-heading text-sm focus:outline-none"
                      placeholder="5.000.000"
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "#999" }}>Gaji, uang saku, atau total pemasukan per bulan</p>
                </div>

                {/* Template cards */}
                <div className="space-y-3">
                  {BUDGET_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`w-full neo-border p-4 text-left transition-all ${
                        selectedTemplate?.id === tpl.id ? "neo-shadow" : "hover:translate-x-1"
                      }`}
                      style={{
                        background: selectedTemplate?.id === tpl.id ? tpl.color + "15" : "#FAFAFA",
                        borderColor: selectedTemplate?.id === tpl.id ? tpl.color : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{tpl.emoji}</span>
                          <div>
                            <div className="font-heading font-bold text-sm">{tpl.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#666" }}>{tpl.desc}</div>
                          </div>
                        </div>
                        {selectedTemplate?.id === tpl.id && (
                          <div
                            className="w-6 h-6 neo-border flex items-center justify-center flex-shrink-0"
                            style={{ background: tpl.color }}
                          >
                            <Check size={14} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (selectedTemplate && templateIncome) setTemplateStep(2);
                  }}
                  disabled={!selectedTemplate || !templateIncome}
                  className="w-full neo-btn px-5 py-3 text-white font-heading text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                  style={{ background: "#00C781" }}
                >
                  Lihat Preview →
                </button>
              </div>
            )}

            {templateStep === 2 && selectedTemplate && templateIncome && (() => {
              const income = parseInt(templateIncome.replace(/\D/g, ""));
              const preview = getTemplatePreview(selectedTemplate, income);
              const totalPct = preview.reduce((s, i) => s + i.pct, 0);
              const totalAmount = preview.reduce((s, i) => s + i.amount, 0);

              return (
                <div className="space-y-4">
                  <div className="neo-border p-3 flex items-center gap-3" style={{ background: "#FFFDE7" }}>
                    <span className="text-xl">{selectedTemplate.emoji}</span>
                    <div>
                      <div className="font-heading text-sm font-bold">Template {selectedTemplate.name}</div>
                      <div className="text-xs" style={{ color: "#666" }}>
                        Penghasilan: <strong>{formatRupiah(income)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {preview.map((item) => (
                      <div
                        key={item.category}
                        className="neo-border p-3 flex items-center justify-between"
                        style={{ background: "#FAFAFA" }}
                      >
                        <div>
                          <span className="font-heading text-sm font-bold">{item.category}</span>
                          <span className="text-xs ml-2 px-1.5 py-0.5 neo-border font-heading font-bold" style={{ background: "#FFCC00", fontSize: 10 }}>
                            {item.pct}%
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold">{formatRupiah(item.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="neo-border p-3 flex items-center justify-between" style={{ background: "#F0FFF4" }}>
                    <span className="font-heading text-sm font-bold">Total Anggaran ({totalPct}%)</span>
                    <span className="font-mono text-sm font-bold" style={{ color: "#00C781" }}>{formatRupiah(totalAmount)}</span>
                  </div>

                  {income - totalAmount > 0 && (
                    <p className="text-xs" style={{ color: "#666" }}>
                      💡 Sisa <strong>{formatRupiah(income - totalAmount)}</strong> ({100 - totalPct}%) bisa kamu tabung atau investasikan!
                    </p>
                  )}

                  {budgetList.length > 0 && (
                    <p className="text-xs neo-border p-2" style={{ background: "#FFFDE7", color: "#666" }}>
                      ⚠️ Budget yang sudah ada akan di-update sesuai template ini.
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setTemplateStep(1)}
                      className="flex-1 neo-btn px-4 py-3 font-heading text-sm font-bold"
                      style={{ background: "#F0F0F0" }}
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={handleApplyTemplate}
                      disabled={templateLoading}
                      className="flex-1 neo-btn px-4 py-3 text-white font-heading text-sm font-bold disabled:opacity-50"
                      style={{ background: "#00C781" }}
                    >
                      {templateLoading ? "Menerapkan..." : "Terapkan! ⚡"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
