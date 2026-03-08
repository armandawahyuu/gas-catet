"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminGrowth } from "@/lib/api";
import {
  TrendingUp,
  Eye,
  Users,
  Activity,
  RefreshCw,
  Clock,
  FileText,
} from "lucide-react";

export default function AdminGrowthPage() {
  const [data, setData] = useState<AdminGrowth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const d = await adminApi.growth();
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

  const {
    daily_page_views,
    top_pages,
    hourly_views,
    user_growth,
    cumulative_users,
    daily_active_users,
    daily_tx_count,
  } = data;

  const maxPV = Math.max(...daily_page_views.map((d) => d.views), 1);
  const maxUV = Math.max(...daily_page_views.map((d) => d.unique_visitors), 1);
  const maxHourly = Math.max(...hourly_views.map((h) => h.views), 1);
  const maxGrowth = Math.max(...user_growth.map((g) => g.new_users), 1);
  const maxCumulative = Math.max(...cumulative_users.map((c) => c.cumulative), 1);
  const maxDAU = Math.max(...daily_active_users.map((d) => d.active_users), 1);
  const maxTxCount = Math.max(...daily_tx_count.map((d) => d.tx_count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={24} strokeWidth={2.5} />
            Growth Analytics
          </h1>
          <p className="text-sm" style={{ color: "#666" }}>
            Analisis pertumbuhan dan trafik 30 hari terakhir
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

      {/* Daily Page Views Chart */}
      <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
        <h2 className="font-heading text-lg font-bold mb-2 flex items-center gap-2">
          <Eye size={18} strokeWidth={2.5} />
          Kunjungan Harian (30 Hari)
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center gap-1 text-xs font-heading font-bold">
            <span className="w-3 h-3 neo-border" style={{ background: "#E3F2FD" }} />
            Page Views
          </span>
          <span className="flex items-center gap-1 text-xs font-heading font-bold">
            <span className="w-3 h-3 neo-border" style={{ background: "#C8E6C9" }} />
            Unique Visitors
          </span>
        </div>
        {daily_page_views.length === 0 ? (
          <EmptyState text="Belum ada data kunjungan" />
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {daily_page_views.map((d) => (
              <div key={d.date} className="flex items-center gap-2">
                <span className="text-xs font-heading font-bold w-20 shrink-0" style={{ color: "#666" }}>
                  {d.date.slice(5)}
                </span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 neo-border flex items-center pl-1"
                      style={{
                        background: "#E3F2FD",
                        width: `${Math.max((d.views / maxPV) * 100, 5)}%`,
                      }}
                    >
                      <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                        {d.views}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 neo-border flex items-center pl-1"
                      style={{
                        background: "#C8E6C9",
                        width: `${Math.max((d.unique_visitors / maxUV) * 100, 5)}%`,
                      }}
                    >
                      <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                        {d.unique_visitors}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Pages + Hourly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <FileText size={18} strokeWidth={2.5} />
            Halaman Populer
          </h2>
          {top_pages.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-2">
              {top_pages.map((p, i) => {
                const maxTP = top_pages[0]?.views || 1;
                const pct = Math.round((p.views / maxTP) * 100);
                return (
                  <div key={p.path}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading text-xs font-bold truncate flex-1">
                        {p.path}
                      </span>
                      <span className="text-xs font-heading font-bold ml-2" style={{ color: "#666" }}>
                        {p.views} views · {p.unique_visitors} uv
                      </span>
                    </div>
                    <div className="w-full h-5 neo-border overflow-hidden" style={{ background: "#F5F5F5" }}>
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background: ["#FFCC00", "#FF3B30", "#00C781", "#E3F2FD", "#F3E5F5", "#FFF3E0", "#E0F7FA", "#FFCDD2", "#C8E6C9", "#FFF9C4"][i] || "#E3F2FD",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hourly Activity (today) */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={18} strokeWidth={2.5} />
            Aktivitas Per Jam (Hari Ini)
          </h2>
          {hourly_views.length === 0 ? (
            <EmptyState text="Belum ada data hari ini" />
          ) : (
            <div className="flex items-end gap-1 h-40">
              {Array.from({ length: 24 }, (_, h) => {
                const item = hourly_views.find((v) => v.hour === h);
                const views = item?.views || 0;
                const heightPct = maxHourly > 0 ? (views / maxHourly) * 100 : 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative flex items-end justify-center" style={{ height: "120px" }}>
                      <div
                        className="w-full neo-border"
                        style={{
                          height: `${Math.max(heightPct, 2)}%`,
                          background: views > 0 ? "#FFCC00" : "#F5F5F5",
                        }}
                      />
                    </div>
                    <span className="text-[8px] font-heading font-bold" style={{ color: "#999" }}>
                      {h}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Growth + Cumulative */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Users Per Day */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={18} strokeWidth={2.5} />
            User Baru Per Hari
          </h2>
          {user_growth.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {user_growth.map((g) => (
                <div key={g.date} className="flex items-center gap-2">
                  <span className="text-xs font-heading font-bold w-24 shrink-0" style={{ color: "#666" }}>
                    {g.date}
                  </span>
                  <div
                    className="h-5 neo-border flex items-center pl-1"
                    style={{
                      background: "#E8F5E9",
                      width: `${Math.max((g.new_users / maxGrowth) * 100, 10)}%`,
                    }}
                  >
                    <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                      +{g.new_users}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cumulative Users */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} strokeWidth={2.5} />
            Total User (Kumulatif)
          </h2>
          {cumulative_users.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {cumulative_users.map((c) => (
                <div key={c.date} className="flex items-center gap-2">
                  <span className="text-xs font-heading font-bold w-24 shrink-0" style={{ color: "#666" }}>
                    {c.date}
                  </span>
                  <div
                    className="h-5 neo-border flex items-center pl-1"
                    style={{
                      background: "#E3F2FD",
                      width: `${Math.max((c.cumulative / maxCumulative) * 100, 10)}%`,
                    }}
                  >
                    <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                      {c.cumulative} user
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DAU + Daily Tx Count */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={18} strokeWidth={2.5} />
            User Aktif Harian (30 Hari)
          </h2>
          {daily_active_users.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {daily_active_users.map((d) => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-xs font-heading font-bold w-24 shrink-0" style={{ color: "#666" }}>
                    {d.date.slice(5)}
                  </span>
                  <div
                    className="h-5 neo-border flex items-center pl-1"
                    style={{
                      background: "#FFF3E0",
                      width: `${Math.max((d.active_users / maxDAU) * 100, 10)}%`,
                    }}
                  >
                    <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                      {d.active_users} user
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Transaction Count */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} strokeWidth={2.5} />
            Transaksi Harian (30 Hari)
          </h2>
          {daily_tx_count.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {daily_tx_count.map((d) => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-xs font-heading font-bold w-24 shrink-0" style={{ color: "#666" }}>
                    {d.date.slice(5)}
                  </span>
                  <div
                    className="h-5 neo-border flex items-center pl-1"
                    style={{
                      background: "#F3E5F5",
                      width: `${Math.max((d.tx_count / maxTxCount) * 100, 10)}%`,
                    }}
                  >
                    <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                      {d.tx_count} tx
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-center text-sm py-8" style={{ color: "#999" }}>
      {text}
    </p>
  );
}
