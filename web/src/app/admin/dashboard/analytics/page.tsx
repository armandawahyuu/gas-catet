"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  AdminAnalytics,
  AdminDailyVolume,
  AdminCategoryBreakdown,
} from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Tag,
  Users,
  RefreshCw,
} from "lucide-react";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "jt";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return n.toString();
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const d = await adminApi.analytics();
    setData(d);
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

  if (!data) return null;

  const { daily_volume, categories, user_growth } = data;

  // Separate income and expense categories
  const incomeCategories = categories.filter((c) => c.transaction_type === "INCOME");
  const expenseCategories = categories.filter((c) => c.transaction_type === "EXPENSE");

  // Max for bar chart scaling
  const maxDaily = Math.max(
    ...daily_volume.map((d) => Math.max(d.income, d.expense)),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={24} strokeWidth={2.5} />
            Analitik
          </h1>
          <p className="text-sm" style={{ color: "#666" }}>
            Statistik global semua pengguna
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

      {/* Daily Volume Chart (last 30 days) */}
      <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
        <h2 className="font-heading text-lg font-bold mb-4">
          Volume Harian (30 Hari Terakhir)
        </h2>
        {daily_volume.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "#999" }}>
            Belum ada data
          </p>
        ) : (
          <div className="space-y-2">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1 text-xs font-heading font-bold">
                <span className="w-3 h-3 neo-border" style={{ background: "#C8E6C9" }} />
                Pemasukan
              </span>
              <span className="flex items-center gap-1 text-xs font-heading font-bold">
                <span className="w-3 h-3 neo-border" style={{ background: "#FFCDD2" }} />
                Pengeluaran
              </span>
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {daily_volume.map((d) => (
                <DailyBar key={d.date} item={d} max={maxDaily} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categories Breakdown: Income vs Expense side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryCard
          title="Kategori Pemasukan"
          icon={<TrendingUp size={18} strokeWidth={2.5} style={{ color: "#2E7D32" }} />}
          items={incomeCategories}
          color="#C8E6C9"
        />
        <CategoryCard
          title="Kategori Pengeluaran"
          icon={<TrendingDown size={18} strokeWidth={2.5} style={{ color: "#C62828" }} />}
          items={expenseCategories}
          color="#FFCDD2"
        />
      </div>

      {/* User Growth */}
      <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
        <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={18} strokeWidth={2.5} />
          Pertumbuhan User
        </h2>
        {user_growth.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "#999" }}>
            Belum ada data
          </p>
        ) : (
          <div className="space-y-2">
            {user_growth.map((g) => (
              <div
                key={g.date}
                className="flex items-center gap-3 neo-border p-2"
                style={{ background: "#FAFAFA" }}
              >
                <span className="text-xs font-heading font-bold w-24" style={{ color: "#666" }}>
                  {g.date}
                </span>
                <div
                  className="h-6 neo-border flex items-center pl-2"
                  style={{
                    background: "#E3F2FD",
                    width: `${Math.max((g.new_users / Math.max(...user_growth.map((x) => x.new_users), 1)) * 100, 10)}%`,
                  }}
                >
                  <span className="text-xs font-heading font-bold whitespace-nowrap">
                    +{g.new_users} user
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyBar({ item, max }: { item: AdminDailyVolume; max: number }) {
  const incPct = Math.max((item.income / max) * 100, 0);
  const expPct = Math.max((item.expense / max) * 100, 0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-heading font-bold w-20 shrink-0" style={{ color: "#666" }}>
        {item.date.slice(5)}
      </span>
      <div className="flex-1 flex flex-col gap-0.5">
        {item.income > 0 && (
          <div
            className="h-4 neo-border flex items-center pl-1"
            style={{ background: "#C8E6C9", width: `${Math.max(incPct, 5)}%` }}
          >
            <span className="text-[10px] font-heading font-bold whitespace-nowrap">
              +{formatShort(item.income)}
            </span>
          </div>
        )}
        {item.expense > 0 && (
          <div
            className="h-4 neo-border flex items-center pl-1"
            style={{ background: "#FFCDD2", width: `${Math.max(expPct, 5)}%` }}
          >
            <span className="text-[10px] font-heading font-bold whitespace-nowrap">
              -{formatShort(item.expense)}
            </span>
          </div>
        )}
        {item.income === 0 && item.expense === 0 && (
          <div className="h-4 flex items-center">
            <span className="text-[10px] font-heading" style={{ color: "#999" }}>—</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({
  title,
  icon,
  items,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  items: AdminCategoryBreakdown[];
  color: string;
}) {
  const maxAmount = items[0]?.total_amount || 1;

  return (
    <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
      <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((c, i) => {
          const pct = Math.round((c.total_amount / maxAmount) * 100);
          return (
            <div key={c.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-heading text-sm font-bold flex items-center gap-1">
                  <Tag size={12} strokeWidth={2.5} />
                  {c.category}
                </span>
                <span className="text-xs font-heading font-bold" style={{ color: "#666" }}>
                  {c.tx_count} tx
                </span>
              </div>
              <div
                className="w-full h-6 neo-border overflow-hidden"
                style={{ background: "#F5F5F5" }}
              >
                <div
                  className="h-full flex items-center pl-2"
                  style={{ width: `${Math.max(pct, 10)}%`, background: color }}
                >
                  <span className="text-xs font-heading font-bold whitespace-nowrap">
                    {formatRupiah(c.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-sm py-4" style={{ color: "#999" }}>
            Belum ada data
          </p>
        )}
      </div>
    </div>
  );
}
