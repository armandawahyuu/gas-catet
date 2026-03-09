"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  analytics,
  type TrendItem,
  type TopItem,
  type AnalyticsSummary,
  type CategoryItem,
} from "@/lib/api";
import { formatRupiah, formatMonthYear, getCurrentMonth } from "@/lib/utils";
import { TrendingUp, TrendingDown, Award, ChevronLeft, ChevronRight, Flame, RefreshCw, Lock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

function RoastCard({ year, month }: { year: number; month: number }) {
  const [roast, setRoast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const fetchRoast = useCallback((refresh = false) => {
    setLoading(true);
    setError("");
    setUpgradeRequired(false);
    analytics
      .roast(year, month, refresh)
      .then((r) => setRoast(r.roast))
      .catch((err) => {
        if (err?.message?.toLowerCase().includes("upgrade")) {
          setUpgradeRequired(true);
        } else {
          setError("Gagal generate roast 😿");
        }
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    fetchRoast();
  }, [fetchRoast]);

  return (
    <div
      className="neo-card p-6"
      style={{ background: "#FFF3E0", borderColor: "#FF6B00" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={20} style={{ color: "#FF6B00" }} strokeWidth={3} />
          <h2 className="font-heading text-lg font-bold" style={{ color: "#FF6B00" }}>
            AI Roast 🔥
          </h2>
        </div>
        <button
          onClick={() => fetchRoast(true)}
          disabled={loading}
          className="neo-btn px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: "#FF6B00", color: "#fff" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Roast Lagi
        </button>
      </div>
      {upgradeRequired ? (
        <div className="flex items-center gap-3">
          <Lock size={18} style={{ color: "#FF6B00" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#FF6B00" }}>
              Kuota roast harian habis (3x/hari)
            </p>
            <Link
              href="/dashboard/upgrade"
              className="text-xs font-bold underline"
              style={{ color: "#FF6B00" }}
            >
              Upgrade ke Pro untuk unlimited roast →
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 rounded" style={{ background: "#FFD9B3", width: "90%" }} />
          <div className="h-4 rounded" style={{ background: "#FFD9B3", width: "75%" }} />
          <div className="h-4 rounded" style={{ background: "#FFD9B3", width: "60%" }} />
        </div>
      ) : error ? (
        <p className="text-sm" style={{ color: "#FF3B30" }}>{error}</p>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#333" }}>
          {roast}
        </p>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [year, setYear] = useState(getCurrentMonth().year);
  const [month, setMonth] = useState(getCurrentMonth().month);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      analytics.summary(year, month),
      analytics.trend(6),
      analytics.topExpenses(year, month, 5),
      analytics.categories(year, month),
    ])
      .then(([s, t, te, cat]) => {
        if (s.status === "fulfilled") setSummary(s.value);
        if (t.status === "fulfilled") setTrend(t.value.months || []);
        if (te.status === "fulfilled") setTopExpenses(te.value.items || []);
        if (cat.status === "fulfilled") setCategories(cat.value.items || []);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const trendChartData = trend.map((t) => ({
    month: t.month.split("-")[1],
    income: t.income,
    expense: t.expense,
  }));

  const colors = ["#FF3B30", "#FF6B5E", "#FF9A8F", "#FFB8B0", "#FFD4CF"];
  const catColors = ["#FF3B30", "#FFCC00", "#00C781", "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#6B7280"];

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-heading text-lg font-bold animate-pulse">
          Memuat analitik...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Analitik
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Insight keuangan kamu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="neo-btn p-2"
            style={{ background: "#FFFFFF" }}
          >
            <ChevronLeft size={18} />
          </button>
          <div
            className="neo-btn px-4 py-2 text-sm cursor-default"
            style={{ background: "#FFCC00" }}
          >
            {monthNames[month - 1]} {year}
          </div>
          <button
            onClick={nextMonth}
            className="neo-btn p-2"
            style={{ background: "#FFFFFF" }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="neo-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: "#00C781" }} strokeWidth={3} />
            <span className="font-heading text-xs font-bold uppercase tracking-wider" style={{ color: "#666" }}>
              Pemasukan
            </span>
          </div>
          <div className="font-mono text-xl font-bold" style={{ color: "#00C781" }}>
            {formatRupiah(summary?.total_income ?? 0)}
          </div>
        </div>
        <div className="neo-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} style={{ color: "#FF3B30" }} strokeWidth={3} />
            <span className="font-heading text-xs font-bold uppercase tracking-wider" style={{ color: "#666" }}>
              Pengeluaran
            </span>
          </div>
          <div className="font-mono text-xl font-bold" style={{ color: "#FF3B30" }}>
            {formatRupiah(summary?.total_expense ?? 0)}
          </div>
        </div>
        <div className="neo-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} style={{ color: "#FFCC00" }} strokeWidth={3} />
            <span className="font-heading text-xs font-bold uppercase tracking-wider" style={{ color: "#666" }}>
              Saldo
            </span>
          </div>
          <div className="font-mono text-xl font-bold">
            {formatRupiah(summary?.balance ?? 0)}
          </div>
        </div>
      </div>

      {/* Roast Card */}
      <RoastCard year={year} month={month} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Chart */}
        <div className="neo-card p-6">
          <h2 className="font-heading text-lg font-bold mb-4">
            Trend 6 Bulan
          </h2>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
                  stroke="#121212"
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                  stroke="#121212"
                  tickFormatter={(v) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(0)}jt`
                      : `${(v / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value) => formatRupiah(Number(value))}
                  labelFormatter={(l) => `Bulan ke-${l}`}
                  contentStyle={{
                    border: "3px solid #121212",
                    boxShadow: "3px 3px 0px #121212",
                    borderRadius: 0,
                    fontFamily: "Plus Jakarta Sans",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#00C781"
                  fill="#00C781"
                  fillOpacity={0.15}
                  strokeWidth={3}
                  name="Pemasukan"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#FF3B30"
                  fill="#FF3B30"
                  fillOpacity={0.15}
                  strokeWidth={3}
                  name="Pengeluaran"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: "#999" }}>
              Belum ada data
            </div>
          )}
        </div>

        {/* Top Expenses */}
        <div className="neo-card p-6">
          <h2 className="font-heading text-lg font-bold mb-4">
            Top Pengeluaran
          </h2>
          {topExpenses.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topExpenses.slice(0, 5)}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                    stroke="#121212"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="description"
                    width={100}
                    tick={{ fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
                    stroke="#121212"
                  />
                  <Tooltip
                    formatter={(value) => formatRupiah(Number(value))}
                    contentStyle={{
                      border: "3px solid #121212",
                      boxShadow: "3px 3px 0px #121212",
                      borderRadius: 0,
                      fontFamily: "Plus Jakarta Sans",
                    }}
                  />
                  <Bar dataKey="total_amount" name="Total">
                    {topExpenses.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {topExpenses.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 neo-border"
                        style={{ background: colors[i] || "#FF3B30" }}
                      />
                      <span className="font-medium">{item.description}</span>
                      <span className="text-xs" style={{ color: "#999" }}>
                        {item.frequency}x
                      </span>
                    </div>
                    <span className="font-mono font-bold" style={{ color: "#FF3B30" }}>
                      {formatRupiah(item.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: "#999" }}>
              Belum ada data pengeluaran
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Expense Categories */}
        <div className="neo-card p-6">
          <h2 className="font-heading text-lg font-bold mb-4">
            Kategori Pengeluaran
          </h2>
          {expenseCategories.length > 0 ? (
            <div className="space-y-3">
              {expenseCategories.map((cat, i) => {
                const maxTotal = expenseCategories[0]?.total || 1;
                const pct = Math.round((cat.total / maxTotal) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: "#FF3B30" }}>
                        {formatRupiah(cat.total)}
                      </span>
                    </div>
                    <div className="h-4 neo-border overflow-hidden" style={{ background: "#FAFAFA" }}>
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: catColors[i % catColors.length] }}
                      />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#999" }}>
                      {cat.count} transaksi
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-sm" style={{ color: "#999" }}>
              Belum ada data
            </div>
          )}
        </div>

        {/* Income Categories */}
        <div className="neo-card p-6">
          <h2 className="font-heading text-lg font-bold mb-4">
            Kategori Pemasukan
          </h2>
          {incomeCategories.length > 0 ? (
            <div className="space-y-3">
              {incomeCategories.map((cat, i) => {
                const maxTotal = incomeCategories[0]?.total || 1;
                const pct = Math.round((cat.total / maxTotal) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: "#00C781" }}>
                        {formatRupiah(cat.total)}
                      </span>
                    </div>
                    <div className="h-4 neo-border overflow-hidden" style={{ background: "#FAFAFA" }}>
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: "#00C781" }}
                      />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#999" }}>
                      {cat.count} transaksi
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-sm" style={{ color: "#999" }}>
              Belum ada data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
