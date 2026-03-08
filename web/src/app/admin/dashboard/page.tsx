"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, AdminDashboard } from "@/lib/api";
import {
  Users,
  Receipt,
  Activity,
  Database,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  RefreshCw,
  UserPlus,
  CalendarCheck,
  Tag,
  Search,
} from "lucide-react";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

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

  const { stats, users, recent_transactions, top_categories } = data;

  const filteredUsers = searchUser
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
          u.email.toLowerCase().includes(searchUser.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-sm" style={{ color: "#666" }}>
            Overview semua data GasCatet
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 neo-border neo-shadow font-heading text-xs font-bold uppercase tracking-wider transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
          style={{ background: "#FFCC00" }}
        >
          <RefreshCw
            size={14}
            strokeWidth={3}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-border neo-shadow p-4" style={{ background: "#E8F5E9" }}>
          <Users size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#666" }}>
            Total Users
          </p>
          <p className="font-heading text-2xl font-bold">{stats.total_users}</p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#E3F2FD" }}>
          <Receipt size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#666" }}>
            Total Transaksi
          </p>
          <p className="font-heading text-2xl font-bold">{stats.total_transactions}</p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#FFF3E0" }}>
          <Activity size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#666" }}>
            Aktif 7 Hari
          </p>
          <p className="font-heading text-2xl font-bold">{stats.active_users_7d}</p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#F3E5F5" }}>
          <Database size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#666" }}>
            Database Size
          </p>
          <p className="font-heading text-2xl font-bold">{stats.database_size}</p>
        </div>
      </div>

      {/* Financial Stats + Today Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="neo-border neo-shadow p-4" style={{ background: "#FFCC00" }}>
          <TrendingUp size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Total Volume
          </p>
          <p className="font-heading text-lg font-bold">{formatRupiah(stats.total_volume)}</p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#C8E6C9" }}>
          <TrendingUp size={20} strokeWidth={2.5} className="mb-2" style={{ color: "#2E7D32" }} />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Total Pemasukan
          </p>
          <p className="font-heading text-lg font-bold" style={{ color: "#2E7D32" }}>
            {formatRupiah(stats.total_income)}
          </p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#FFCDD2" }}>
          <TrendingDown size={20} strokeWidth={2.5} className="mb-2" style={{ color: "#C62828" }} />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Total Pengeluaran
          </p>
          <p className="font-heading text-lg font-bold" style={{ color: "#C62828" }}>
            {formatRupiah(stats.total_expense)}
          </p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#E0F7FA" }}>
          <MessageCircle size={20} strokeWidth={2.5} className="mb-2" style={{ color: "#0088cc" }} />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Telegram Users
          </p>
          <p className="font-heading text-2xl font-bold">{stats.telegram_users}</p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#FFF9C4" }}>
          <CalendarCheck size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#555" }}>
            Hari Ini
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 font-heading text-sm font-bold">
              <UserPlus size={14} strokeWidth={2.5} />
              {stats.new_users_today}
            </span>
            <span className="flex items-center gap-1 font-heading text-sm font-bold">
              <Receipt size={14} strokeWidth={2.5} />
              {stats.tx_today}
            </span>
          </div>
        </div>
      </div>

      {/* Three columns: Top Categories + Users + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Categories */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Tag size={18} strokeWidth={2.5} />
            Top 5 Kategori
          </h2>
          <div className="space-y-3">
            {top_categories.map((cat, i) => {
              const maxCount = top_categories[0]?.tx_count || 1;
              const pct = Math.round((cat.tx_count / maxCount) * 100);
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-sm font-bold">
                      {i + 1}. {cat.category}
                    </span>
                    <span className="text-xs font-heading font-bold" style={{ color: "#666" }}>
                      {cat.tx_count} tx
                    </span>
                  </div>
                  <div className="w-full h-6 neo-border overflow-hidden" style={{ background: "#F5F5F5" }}>
                    <div
                      className="h-full flex items-center pl-2"
                      style={{
                        width: `${pct}%`,
                        background: ["#FFCC00", "#FF3B30", "#00C781", "#E3F2FD", "#F3E5F5"][i] || "#E3F2FD",
                        minWidth: "fit-content",
                      }}
                    >
                      <span className="text-xs font-heading font-bold whitespace-nowrap">
                        {formatRupiah(cat.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {top_categories.length === 0 && (
              <p className="text-center text-sm" style={{ color: "#999" }}>
                Belum ada data
              </p>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-3 flex items-center gap-2">
            <Users size={18} strokeWidth={2.5} />
            Users ({users.length})
          </h2>
          {/* Search */}
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
          <div className="space-y-2 max-h-[450px] overflow-y-auto">
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
                    {new Date(u.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {u.has_telegram && (
                    <MessageCircle size={14} strokeWidth={2.5} style={{ color: "#0088cc" }} />
                  )}
                  <div
                    className="neo-border px-2 py-1 text-xs font-heading font-bold text-center"
                    style={{ background: "#E3F2FD", minWidth: 44 }}
                  >
                    {u.tx_count}
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

        {/* Recent Transactions */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Receipt size={18} strokeWidth={2.5} />
            10 Transaksi Terbaru
          </h2>
          <div className="space-y-2 max-h-[450px] overflow-y-auto">
            {recent_transactions.map((tx) => (
              <div key={tx.id} className="neo-border p-3" style={{ background: "#FAFAFA" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-heading text-sm font-bold truncate flex-1">
                    {tx.description || tx.category}
                  </p>
                  <span
                    className="font-heading text-sm font-bold ml-2 whitespace-nowrap"
                    style={{
                      color: tx.transaction_type === "INCOME" ? "#00C781" : "#FF3B30",
                    }}
                  >
                    {tx.transaction_type === "INCOME" ? "+" : "-"}
                    {formatRupiah(tx.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs truncate" style={{ color: "#666" }}>
                    {tx.user_name}
                  </p>
                  <p className="text-xs whitespace-nowrap ml-2" style={{ color: "#999" }}>
                    {tx.transaction_date}
                  </p>
                </div>
              </div>
            ))}
            {recent_transactions.length === 0 && (
              <p className="text-center text-sm py-4" style={{ color: "#999" }}>
                Belum ada transaksi
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
