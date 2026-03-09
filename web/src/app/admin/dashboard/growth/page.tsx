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
  BarChart3,
  Zap,
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

  // Summary calcs
  const totalPV = daily_page_views.reduce((s, d) => s + d.views, 0);
  const totalUV = daily_page_views.reduce((s, d) => s + d.unique_visitors, 0);
  const totalNewUsers = user_growth.reduce((s, g) => s + g.new_users, 0);
  const totalTx = daily_tx_count.reduce((s, d) => s + d.tx_count, 0);
  const avgDAU = daily_active_users.length > 0
    ? Math.round(daily_active_users.reduce((s, d) => s + d.active_users, 0) / daily_active_users.length)
    : 0;
  const latestCumulative = cumulative_users.length > 0 ? cumulative_users[cumulative_users.length - 1].cumulative : 0;

  const maxPV = Math.max(...daily_page_views.map((d) => d.views), 1);
  const maxUV = Math.max(...daily_page_views.map((d) => d.unique_visitors), 1);
  const maxHourly = Math.max(...hourly_views.map((h) => h.views), 1);
  const maxGrowth = Math.max(...user_growth.map((g) => g.new_users), 1);
  const maxCumulative = Math.max(...cumulative_users.map((c) => c.cumulative), 1);
  const maxDAU = Math.max(...daily_active_users.map((d) => d.active_users), 1);
  const maxTxCount = Math.max(...daily_tx_count.map((d) => d.tx_count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <BarChart3 size={28} strokeWidth={2.5} />
            Growth Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
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

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryStat label="Page Views" value={totalPV.toLocaleString("id-ID")} bg="#E3F2FD" icon={<Eye size={16} strokeWidth={2.5} />} />
        <SummaryStat label="Unique Visitors" value={totalUV.toLocaleString("id-ID")} bg="#E8F5E9" icon={<Users size={16} strokeWidth={2.5} />} />
        <SummaryStat label="User Baru" value={`+${totalNewUsers}`} bg="#FFCC00" icon={<Zap size={16} strokeWidth={2.5} />} />
        <SummaryStat label="Total User" value={latestCumulative.toString()} bg="#FFF3E0" icon={<Users size={16} strokeWidth={2.5} />} />
        <SummaryStat label="Avg DAU" value={avgDAU.toString()} bg="#F3E5F5" icon={<Activity size={16} strokeWidth={2.5} />} />
        <SummaryStat label="Transaksi" value={totalTx.toLocaleString("id-ID")} bg="#FFCDD2" icon={<TrendingUp size={16} strokeWidth={2.5} />} />
      </div>

      {/* Daily Page Views Chart */}
      <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
        <h2 className="font-heading text-base font-bold mb-2 flex items-center gap-2">
          <Eye size={18} strokeWidth={2.5} />
          Kunjungan Harian
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center gap-1 text-xs font-heading font-bold">
            <span className="w-3 h-3 neo-border" style={{ background: "#FFCC00" }} />
            Page Views
          </span>
          <span className="flex items-center gap-1 text-xs font-heading font-bold">
            <span className="w-3 h-3 neo-border" style={{ background: "#00C781" }} />
            Unique Visitors
          </span>
        </div>
        {daily_page_views.length === 0 ? (
          <EmptyState text="Belum ada data kunjungan" />
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {daily_page_views.map((d) => (
              <div key={d.date} className="flex items-center gap-2 group">
                <span className="text-[11px] font-heading font-bold w-16 shrink-0 tabular-nums" style={{ color: "#666" }}>
                  {d.date.slice(5)}
                </span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 neo-border flex items-center pl-2 transition-all"
                      style={{
                        background: "#FFCC00",
                        width: `${Math.max((d.views / maxPV) * 100, 4)}%`,
                      }}
                    >
                      <span className="text-[10px] font-heading font-bold whitespace-nowrap">
                        {d.views}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 neo-border flex items-center pl-2 transition-all"
                      style={{
                        background: "#00C781",
                        width: `${Math.max((d.unique_visitors / maxUV) * 100, 4)}%`,
                      }}
                    >
                      <span className="text-[10px] font-heading font-bold whitespace-nowrap text-white">
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
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
            <FileText size={18} strokeWidth={2.5} />
            Halaman Populer
          </h2>
          {top_pages.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-3">
              {top_pages.map((p, i) => {
                const maxTP = top_pages[0]?.views || 1;
                const pct = Math.round((p.views / maxTP) * 100);
                const colors = ["#FFCC00", "#FF3B30", "#00C781", "#3B82F6", "#A855F7", "#F59E0B", "#14B8A6", "#EC4899", "#6366F1", "#10B981"];
                return (
                  <div key={p.path}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading text-xs font-bold truncate flex-1">
                        <span
                          className="inline-block w-2 h-2 neo-border mr-2"
                          style={{ background: colors[i % colors.length] }}
                        />
                        {p.path}
                      </span>
                      <span className="text-[11px] font-heading font-bold ml-2 tabular-nums" style={{ color: "#666" }}>
                        {p.views} · {p.unique_visitors} uv
                      </span>
                    </div>
                    <div className="w-full h-5 neo-border overflow-hidden" style={{ background: "#F5F5F5" }}>
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: colors[i % colors.length] }}
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
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
            <Clock size={18} strokeWidth={2.5} />
            Aktivitas Per Jam (Hari Ini)
          </h2>
          {hourly_views.length === 0 ? (
            <EmptyState text="Belum ada data hari ini" />
          ) : (
            <div className="flex items-end gap-[3px] h-44">
              {Array.from({ length: 24 }, (_, h) => {
                const item = hourly_views.find((v) => v.hour === h);
                const views = item?.views || 0;
                const heightPct = maxHourly > 0 ? (views / maxHourly) * 100 : 0;
                const isNow = new Date().getHours() === h;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {views > 0 && (
                      <span className="text-[8px] font-heading font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#555" }}>
                        {views}
                      </span>
                    )}
                    <div className="w-full relative flex items-end justify-center" style={{ height: "120px" }}>
                      <div
                        className={`w-full ${isNow ? "neo-border" : ""} transition-all`}
                        style={{
                          height: `${Math.max(heightPct, 3)}%`,
                          background: isNow ? "#FF3B30" : views > 0 ? "#FFCC00" : "#F0F0F0",
                          borderWidth: isNow ? "2px" : undefined,
                        }}
                      />
                    </div>
                    <span
                      className="text-[8px] font-heading font-bold"
                      style={{ color: isNow ? "#FF3B30" : "#bbb" }}
                    >
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
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
            <Users size={18} strokeWidth={2.5} />
            User Baru Per Hari
          </h2>
          {user_growth.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {user_growth.map((g) => (
                <div key={g.date} className="flex items-center gap-2">
                  <span className="text-[11px] font-heading font-bold w-20 shrink-0 tabular-nums" style={{ color: "#666" }}>
                    {g.date.slice(5)}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 neo-border flex items-center pl-2"
                      style={{
                        background: g.new_users > 0 ? "#E8F5E9" : "#F9F9F9",
                        width: `${Math.max((g.new_users / maxGrowth) * 100, 8)}%`,
                      }}
                    >
                      <span className="text-[11px] font-heading font-bold whitespace-nowrap">
                        +{g.new_users}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cumulative Users */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} strokeWidth={2.5} />
            Total User (Kumulatif)
          </h2>
          {cumulative_users.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {cumulative_users.map((c) => (
                <div key={c.date} className="flex items-center gap-2">
                  <span className="text-[11px] font-heading font-bold w-20 shrink-0 tabular-nums" style={{ color: "#666" }}>
                    {c.date.slice(5)}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 neo-border flex items-center pl-2"
                      style={{
                        background: "#E3F2FD",
                        width: `${Math.max((c.cumulative / maxCumulative) * 100, 8)}%`,
                      }}
                    >
                      <span className="text-[11px] font-heading font-bold whitespace-nowrap">
                        {c.cumulative}
                      </span>
                    </div>
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
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
            <Activity size={18} strokeWidth={2.5} />
            User Aktif Harian
          </h2>
          {daily_active_users.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {daily_active_users.map((d) => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-[11px] font-heading font-bold w-20 shrink-0 tabular-nums" style={{ color: "#666" }}>
                    {d.date.slice(5)}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 neo-border flex items-center pl-2"
                      style={{
                        background: d.active_users > 0 ? "#FFF3E0" : "#F9F9F9",
                        width: `${Math.max((d.active_users / maxDAU) * 100, 8)}%`,
                      }}
                    >
                      <span className="text-[11px] font-heading font-bold whitespace-nowrap">
                        {d.active_users}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Transaction Count */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} strokeWidth={2.5} />
            Transaksi Harian
          </h2>
          {daily_tx_count.length === 0 ? (
            <EmptyState text="Belum ada data" />
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {daily_tx_count.map((d) => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-[11px] font-heading font-bold w-20 shrink-0 tabular-nums" style={{ color: "#666" }}>
                    {d.date.slice(5)}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 neo-border flex items-center pl-2"
                      style={{
                        background: d.tx_count > 0 ? "#F3E5F5" : "#F9F9F9",
                        width: `${Math.max((d.tx_count / maxTxCount) * 100, 8)}%`,
                      }}
                    >
                      <span className="text-[11px] font-heading font-bold whitespace-nowrap">
                        {d.tx_count} tx
                      </span>
                    </div>
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

function SummaryStat({ label, value, bg, icon }: { label: string; value: string; bg: string; icon: React.ReactNode }) {
  return (
    <div className="neo-border neo-shadow p-3" style={{ background: bg }}>
      <div className="mb-1">{icon}</div>
      <p className="font-heading text-xl font-bold">{value}</p>
      <p className="text-[9px] font-heading font-bold uppercase tracking-wider" style={{ color: "#555" }}>{label}</p>
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
