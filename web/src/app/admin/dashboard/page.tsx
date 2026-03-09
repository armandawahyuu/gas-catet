"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, AdminDashboard, AdminRecentTx } from "@/lib/api";
import {
  Users,
  UserPlus,
  Activity,
  Eye,
  Globe,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  Database,
  Receipt,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  const fetchData = useCallback(async () => {
    const d = await adminApi.dashboard();
    setData(d);
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-heading text-xl font-bold animate-pulse">
          Loading data...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, visitors, users, recent_transactions } = data;

  const filteredUsers = searchUser
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
          u.email.toLowerCase().includes(searchUser.toLowerCase())
      )
    : users;

  const telegramPct = stats.total_users > 0
    ? Math.round((stats.telegram_users / stats.total_users) * 100)
    : 0;
  const activePct = stats.total_users > 0
    ? Math.round((stats.active_users_7d / stats.total_users) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Zap size={28} strokeWidth={3} style={{ color: "#FFCC00" }} />
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Pertumbuhan & kesehatan aplikasi GasCatet
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

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-border neo-shadow p-5 col-span-2 lg:col-span-1" style={{ background: "#FFCC00" }}>
          <div className="flex items-center justify-between mb-3">
            <Users size={22} strokeWidth={2.5} />
            <span className="text-xs font-heading font-bold neo-border px-2 py-0.5" style={{ background: "#FFF" }}>
              TOTAL
            </span>
          </div>
          <p className="font-heading text-4xl font-bold">{stats.total_users}</p>
          <p className="text-xs font-heading font-bold mt-1" style={{ color: "#333" }}>
            Users terdaftar
          </p>
        </div>

        <div className="neo-border neo-shadow p-5" style={{ background: "#E8F5E9" }}>
          <div className="flex items-center justify-between mb-3">
            <UserPlus size={22} strokeWidth={2.5} />
            <span className="text-xs font-heading font-bold neo-border px-2 py-0.5" style={{ background: "#FFF" }}>
              HARI INI
            </span>
          </div>
          <p className="font-heading text-3xl font-bold">+{stats.new_users_today}</p>
          <p className="text-[11px] font-heading font-bold mt-1" style={{ color: "#555" }}>
            7d: +{stats.new_users_week} · 30d: +{stats.new_users_month}
          </p>
        </div>

        <div className="neo-border neo-shadow p-5" style={{ background: "#E3F2FD" }}>
          <div className="flex items-center justify-between mb-3">
            <Activity size={22} strokeWidth={2.5} />
            <span className="neo-border px-2 py-0.5 text-xs font-heading font-bold" style={{ background: activePct >= 50 ? "#C8E6C9" : "#FFF9C4" }}>
              {activePct}%
            </span>
          </div>
          <p className="font-heading text-3xl font-bold">{stats.active_users_7d}</p>
          <p className="text-[11px] font-heading font-bold mt-1" style={{ color: "#555" }}>
            Aktif 7 hari · 30d: {stats.active_users_30d}
          </p>
        </div>

        <div className="neo-border neo-shadow p-5" style={{ background: "#FFF3E0" }}>
          <div className="flex items-center justify-between mb-3">
            <Receipt size={22} strokeWidth={2.5} />
            <span className="text-xs font-heading font-bold neo-border px-2 py-0.5" style={{ background: "#FFF" }}>
              {stats.tx_today} HARI INI
            </span>
          </div>
          <p className="font-heading text-3xl font-bold">{stats.total_transactions.toLocaleString("id-ID")}</p>
          <p className="text-[11px] font-heading font-bold mt-1" style={{ color: "#555" }}>
            Total transaksi · avg {stats.avg_tx_per_user.toFixed(1)}/user
          </p>
        </div>
      </div>

      {/* Visitor + Telegram Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visitor Card */}
        <div className="neo-border p-5 lg:col-span-2" style={{ background: "#FFF" }}>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#999" }}>
            <Eye size={14} strokeWidth={2.5} />
            Traffic Hari Ini
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MiniStat label="Page Views" value={visitors.page_views_today.toLocaleString("id-ID")} accent="#E3F2FD" />
            <MiniStat label="Unique Visitors" value={visitors.unique_visitors_today.toLocaleString("id-ID")} accent="#E8F5E9" />
            <MiniStat label="UV 7 Hari" value={visitors.unique_visitors_week.toLocaleString("id-ID")} accent="#FFF3E0" />
            <MiniStat label="UV 30 Hari" value={visitors.unique_visitors_month.toLocaleString("id-ID")} accent="#F3E5F5" />
            <MiniStat label="Total PV" value={visitors.total_page_views.toLocaleString("id-ID")} accent="#FFF9C4" />
            <MiniStat label="Total UV" value={visitors.total_unique_visitors.toLocaleString("id-ID")} accent="#E0F7FA" />
          </div>
        </div>

        {/* Telegram Card */}
        <div className="neo-border p-5 flex flex-col justify-between" style={{ background: "#E0F7FA" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={20} strokeWidth={2.5} style={{ color: "#0088cc" }} />
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider" style={{ color: "#0088cc" }}>
                Telegram Bot
              </h2>
            </div>
            <p className="font-heading text-4xl font-bold" style={{ color: "#0088cc" }}>
              {stats.telegram_users}
            </p>
            <p className="text-xs font-heading font-bold mt-1" style={{ color: "#0088cc" }}>
              user terkoneksi
            </p>
          </div>
          <div className="mt-4 neo-border px-3 py-2 text-center" style={{ background: "#FFF" }}>
            <span className="text-sm font-heading font-bold">{telegramPct}%</span>
            <span className="text-[11px] font-heading font-bold ml-1" style={{ color: "#666" }}>dari total user</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="neo-border p-5" style={{ background: "#FFF" }}>
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#999" }}>
          <Clock size={14} strokeWidth={2.5} />
          Transaksi Terbaru
        </h2>
        {recent_transactions && recent_transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "3px solid #121212" }}>
                  <th className="text-left py-2 pr-4 text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#999" }}>User</th>
                  <th className="text-left py-2 pr-4 text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#999" }}>Deskripsi</th>
                  <th className="text-left py-2 pr-4 text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#999" }}>Kategori</th>
                  <th className="text-right py-2 text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#999" }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {recent_transactions.slice(0, 10).map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-sm py-6" style={{ color: "#999" }}>Belum ada transaksi</p>
        )}
      </div>

      {/* Users List + System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="neo-border p-5 lg:col-span-2" style={{ background: "#FFF" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "#999" }}>
              <Users size={14} strokeWidth={2.5} />
              Daftar User ({users.length})
            </h2>
          </div>
          <div className="relative mb-3">
            <Search
              size={16}
              strokeWidth={2.5}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#999" }}
            />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 neo-border font-heading text-xs font-bold focus:outline-none"
              style={{ background: "#FAFAFA" }}
              placeholder="Cari user..."
            />
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="neo-border p-3 flex items-center gap-3 transition-colors hover:bg-gray-50"
                style={{ background: "#FAFAFA" }}
              >
                <div
                  className="w-9 h-9 neo-border flex items-center justify-center shrink-0 font-heading text-sm font-bold"
                  style={{ background: "#FFCC00" }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-bold truncate">{u.name}</p>
                  <p className="text-xs truncate" style={{ color: "#666" }}>
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.has_telegram && (
                    <div
                      className="neo-border px-1.5 py-0.5 text-[10px] font-heading font-bold"
                      style={{ background: "#E0F7FA", color: "#0088cc" }}
                    >
                      TG
                    </div>
                  )}
                  <div
                    className="neo-border px-2 py-1 text-xs font-heading font-bold text-center"
                    style={{ background: "#E3F2FD", minWidth: 44 }}
                  >
                    {u.tx_count} tx
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-sm py-4" style={{ color: "#999" }}>
                {searchUser ? "Tidak ditemukan" : "Belum ada user"}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-4">
          <div className="neo-border neo-shadow p-5" style={{ background: "#F3E5F5" }}>
            <TrendingUp size={18} strokeWidth={2.5} className="mb-2" />
            <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#555" }}>
              Rata-rata Tx/User
            </p>
            <p className="font-heading text-3xl font-bold mt-1">{stats.avg_tx_per_user.toFixed(1)}</p>
          </div>
          <div className="neo-border neo-shadow p-5" style={{ background: "#FFCDD2" }}>
            <Receipt size={18} strokeWidth={2.5} className="mb-2" />
            <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#555" }}>
              Transaksi Hari Ini
            </p>
            <p className="font-heading text-3xl font-bold mt-1">{stats.tx_today}</p>
          </div>
          <div className="neo-border p-4 flex items-center gap-3" style={{ background: "#FFF" }}>
            <Database size={16} strokeWidth={2.5} style={{ color: "#999" }} />
            <div>
              <p className="text-[10px] font-heading font-bold uppercase" style={{ color: "#999" }}>Database</p>
              <p className="text-sm font-heading font-bold">{stats.database_size}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="neo-border p-3" style={{ background: accent }}>
      <p className="text-[10px] font-heading font-bold uppercase tracking-wider" style={{ color: "#555" }}>
        {label}
      </p>
      <p className="font-heading text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TxRow({ tx }: { tx: AdminRecentTx }) {
  const isIncome = tx.transaction_type === "INCOME";
  return (
    <tr className="group" style={{ borderBottom: "1px solid #eee" }}>
      <td className="py-2.5 pr-4">
        <p className="font-heading text-xs font-bold truncate max-w-[140px]">{tx.user_name}</p>
        <p className="text-[10px] truncate max-w-[140px]" style={{ color: "#999" }}>{tx.user_email}</p>
      </td>
      <td className="py-2.5 pr-4">
        <p className="text-xs font-heading font-bold truncate max-w-[180px]">{tx.description || "-"}</p>
      </td>
      <td className="py-2.5 pr-4">
        <span
          className="neo-border px-2 py-0.5 text-[10px] font-heading font-bold inline-block"
          style={{ background: isIncome ? "#E8F5E9" : "#FFCDD2" }}
        >
          {tx.category}
        </span>
      </td>
      <td className="py-2.5 text-right">
        <span className="font-heading text-sm font-bold flex items-center justify-end gap-1">
          {isIncome ? (
            <ArrowUpRight size={14} strokeWidth={2.5} style={{ color: "#2E7D32" }} />
          ) : (
            <ArrowDownRight size={14} strokeWidth={2.5} style={{ color: "#D32F2F" }} />
          )}
          <span style={{ color: isIncome ? "#2E7D32" : "#D32F2F" }}>
            {isIncome ? "+" : "-"}Rp{Math.abs(tx.amount).toLocaleString("id-ID")}
          </span>
        </span>
      </td>
    </tr>
  );
}
