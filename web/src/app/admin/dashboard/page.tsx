"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, AdminDashboard } from "@/lib/api";
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

  const { stats, visitors, users } = data;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-sm" style={{ color: "#666" }}>
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

      {/* Visitor Stats */}
      <div>
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#999" }}>
          Visitor &amp; Traffic
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={<Eye size={20} strokeWidth={2.5} />}
            label="Page Views Hari Ini"
            value={visitors.page_views_today.toLocaleString("id-ID")}
            bg="#E3F2FD"
          />
          <StatCard
            icon={<Globe size={20} strokeWidth={2.5} />}
            label="Unique Visitor Hari Ini"
            value={visitors.unique_visitors_today.toLocaleString("id-ID")}
            bg="#E8F5E9"
          />
          <StatCard
            icon={<TrendingUp size={20} strokeWidth={2.5} />}
            label="Unique Visitor 7 Hari"
            value={visitors.unique_visitors_week.toLocaleString("id-ID")}
            bg="#FFF3E0"
          />
          <StatCard
            icon={<TrendingUp size={20} strokeWidth={2.5} />}
            label="Unique Visitor 30 Hari"
            value={visitors.unique_visitors_month.toLocaleString("id-ID")}
            bg="#F3E5F5"
          />
          <StatCard
            icon={<Eye size={20} strokeWidth={2.5} />}
            label="Total Page Views"
            value={visitors.total_page_views.toLocaleString("id-ID")}
            bg="#FFF9C4"
          />
          <StatCard
            icon={<Globe size={20} strokeWidth={2.5} />}
            label="Total Unique Visitors"
            value={visitors.total_unique_visitors.toLocaleString("id-ID")}
            bg="#E0F7FA"
          />
        </div>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#999" }}>
          Users &amp; Engagement
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={20} strokeWidth={2.5} />}
            label="Total Users"
            value={stats.total_users.toString()}
            bg="#E8F5E9"
          />
          <StatCard
            icon={<UserPlus size={20} strokeWidth={2.5} />}
            label="User Baru Hari Ini"
            value={`+${stats.new_users_today}`}
            bg="#FFCC00"
            sub={`Minggu: +${stats.new_users_week} · Bulan: +${stats.new_users_month}`}
          />
          <StatCard
            icon={<Activity size={20} strokeWidth={2.5} />}
            label="User Aktif (7d)"
            value={`${stats.active_users_7d}`}
            bg="#E3F2FD"
            sub={`${activePct}% dari total · 30d: ${stats.active_users_30d}`}
          />
          <StatCard
            icon={<MessageCircle size={20} strokeWidth={2.5} style={{ color: "#0088cc" }} />}
            label="Pakai Telegram Bot"
            value={stats.telegram_users.toString()}
            bg="#E0F7FA"
            sub={`${telegramPct}% dari total user`}
          />
        </div>
      </div>

      {/* Activity Stats */}
      <div>
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#999" }}>
          Aktivitas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={<Receipt size={20} strokeWidth={2.5} />}
            label="Total Transaksi"
            value={stats.total_transactions.toLocaleString("id-ID")}
            bg="#FFF3E0"
          />
          <StatCard
            icon={<Receipt size={20} strokeWidth={2.5} />}
            label="Transaksi Hari Ini"
            value={stats.tx_today.toString()}
            bg="#FFCDD2"
          />
          <StatCard
            icon={<TrendingUp size={20} strokeWidth={2.5} />}
            label="Rata-rata Tx/User"
            value={stats.avg_tx_per_user.toFixed(1)}
            bg="#F3E5F5"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
        <h2 className="font-heading text-lg font-bold mb-3 flex items-center gap-2">
          <Users size={18} strokeWidth={2.5} />
          Daftar User ({users.length})
        </h2>
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
            className="w-full pl-9 pr-3 py-2 neo-border font-heading text-xs font-bold focus:outline-none"
            style={{ background: "#FAFAFA" }}
            placeholder="Cari user..."
          />
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="neo-border p-3 flex items-center justify-between"
              style={{ background: "#FAFAFA" }}
            >
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-bold truncate">{u.name}</p>
                <p className="text-xs truncate" style={{ color: "#666" }}>
                  {u.email}
                </p>
                <p className="text-xs mt-1" style={{ color: "#999" }}>
                  Gabung:{" "}
                  {new Date(u.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2">
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

      {/* System Info */}
      <div className="flex items-center gap-2 text-xs font-heading" style={{ color: "#999" }}>
        <Database size={12} strokeWidth={2.5} />
        Database: {stats.database_size}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="neo-border neo-shadow p-4" style={{ background: bg }}>
      <div className="mb-2">{icon}</div>
      <p
        className="text-xs font-heading font-bold uppercase tracking-wider"
        style={{ color: "#555" }}
      >
        {label}
      </p>
      <p className="font-heading text-2xl font-bold mt-1">{value}</p>
      {sub && (
        <p className="text-[10px] font-heading font-bold mt-1" style={{ color: "#666" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
