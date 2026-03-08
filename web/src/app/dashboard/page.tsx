"use client";

import { useEffect, useState, useCallback } from "react";
import { analytics, transactions, type AnalyticsSummary, type Transaction, type DailyItem } from "@/lib/api";
import { formatRupiah, formatDate, getCurrentMonth } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [dailyData, setDailyData] = useState<DailyItem[]>([]);
  const [todayData, setTodayData] = useState<{ total_income: number; total_expense: number; tx_count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { year, month } = getCurrentMonth();
    Promise.all([
      analytics.summary(year, month),
      transactions.list({ limit: 5 }),
      analytics.daily(year, month),
      transactions.today(),
    ])
      .then(([s, t, d, td]) => {
        setSummary(s);
        setRecentTx(t.transactions || []);
        setDailyData(d.days || []);
        setTodayData(td);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-heading text-lg font-bold animate-pulse">
          Memuat data...
        </div>
      </div>
    );
  }

  const chartData = dailyData.map((d) => ({
    date: d.date.split("-")[2],
    income: d.income,
    expense: d.expense,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          Ringkasan keuangan kamu bulan ini
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <SummaryCard
          label="Total Pemasukan"
          amount={summary?.total_income ?? 0}
          icon={<TrendingUp size={24} strokeWidth={2.5} />}
          color="#00C781"
        />
        <SummaryCard
          label="Total Pengeluaran"
          amount={summary?.total_expense ?? 0}
          icon={<TrendingDown size={24} strokeWidth={2.5} />}
          color="#FF3B30"
        />
        <SummaryCard
          label="Sisa Saldo"
          amount={summary?.balance ?? 0}
          icon={<Wallet size={24} strokeWidth={2.5} />}
          color="#FFCC00"
        />
      </div>

      {/* Today Widget */}
      {todayData && (
        <div
          className="neo-border neo-shadow p-5 mb-8"
          style={{ background: "#FFCC00" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚡</span>
            <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
              Hari Ini
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-heading font-bold uppercase" style={{ color: "#333" }}>Pemasukan</p>
              <p className="font-heading text-lg font-bold" style={{ color: "#00C781" }}>
                +{formatRupiah(todayData.total_income)}
              </p>
            </div>
            <div>
              <p className="text-xs font-heading font-bold uppercase" style={{ color: "#333" }}>Pengeluaran</p>
              <p className="font-heading text-lg font-bold" style={{ color: "#FF3B30" }}>
                -{formatRupiah(todayData.total_expense)}
              </p>
            </div>
            <div>
              <p className="text-xs font-heading font-bold uppercase" style={{ color: "#333" }}>Transaksi</p>
              <p className="font-heading text-lg font-bold">
                {todayData.tx_count}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Daily Chart */}
        <div className="lg:col-span-3 neo-card p-6">
          <h2 className="font-heading text-lg font-bold mb-4">
            Pengeluaran Harian
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
                  stroke="#121212"
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                  stroke="#121212"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatRupiah(Number(value))}
                  labelFormatter={(l) => `Tanggal ${l}`}
                  contentStyle={{
                    border: "3px solid #121212",
                    boxShadow: "3px 3px 0px #121212",
                    borderRadius: 0,
                    fontFamily: "Plus Jakarta Sans",
                  }}
                />
                <Bar dataKey="expense" fill="#FF3B30" name="Pengeluaran" />
                <Bar dataKey="income" fill="#00C781" name="Pemasukan" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-sm" style={{ color: "#999" }}>
              <p>Belum ada data bulan ini</p>
              <a href="/dashboard/transactions" className="neo-btn px-4 py-2 mt-3 text-xs font-heading font-bold" style={{ background: "#FFCC00" }}>Catat Transaksi Pertama</a>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 neo-card p-6">
          <h2 className="font-heading text-lg font-bold mb-4">
            Transaksi Terakhir
          </h2>
          {recentTx.length > 0 ? (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3"
                  style={{ borderBottom: "1px solid #E5E5E5" }}
                >
                  <div
                    className="w-9 h-9 flex items-center justify-center neo-border flex-shrink-0"
                    style={{
                      background:
                        tx.transaction_type === "INCOME"
                          ? "#00C781"
                          : "#FF3B30",
                    }}
                  >
                    {tx.transaction_type === "INCOME" ? (
                      <ArrowUpRight size={16} color="white" strokeWidth={3} />
                    ) : (
                      <ArrowDownRight size={16} color="white" strokeWidth={3} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {tx.description}
                    </div>
                    <div className="text-xs" style={{ color: "#999" }}>
                      {formatDate(tx.transaction_date)} · {tx.category || "Lainnya"}
                    </div>
                  </div>
                  <div
                    className="font-mono text-sm font-bold whitespace-nowrap"
                    style={{
                      color:
                        tx.transaction_type === "INCOME"
                          ? "#00C781"
                          : "#FF3B30",
                    }}
                  >
                    {tx.transaction_type === "INCOME" ? "+" : "-"}
                    {formatRupiah(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-sm" style={{ color: "#999" }}>
              <p>Belum ada transaksi</p>
              <a href="/dashboard/transactions" className="neo-btn px-4 py-2 mt-3 text-xs font-heading font-bold" style={{ background: "#FFCC00" }}>Mulai Catat</a>
            </div>
          )}
        </div>
      </div>

      {/* AI Roast */}
      <div className="mt-5">
        <RoastCard />
      </div>
    </div>
  );
}

function RoastCard() {
  const { year, month } = getCurrentMonth();
  const [roast, setRoast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRoast = useCallback(() => {
    setLoading(true);
    setError("");
    analytics
      .roast(year, month)
      .then((r) => setRoast(r.roast))
      .catch(() => setError("Gagal generate roast 😿"))
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
          onClick={fetchRoast}
          disabled={loading}
          className="neo-btn px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: "#FF6B00", color: "#fff" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Roast Lagi
        </button>
      </div>
      {loading ? (
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

function SummaryCard({
  label,
  amount,
  icon,
  color,
}: {
  label: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="neo-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-heading text-xs font-bold uppercase tracking-wider"
          style={{ color: "#666" }}
        >
          {label}
        </span>
        <div
          className="w-10 h-10 flex items-center justify-center neo-border"
          style={{ background: color }}
        >
          {icon}
        </div>
      </div>
      <div className="font-mono text-2xl font-bold">{formatRupiah(amount)}</div>
    </div>
  );
}
