"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminDashboard } from "@/lib/api";
import {
  Users,
  Receipt,
  Activity,
  Database,
  TrendingUp,
  MessageCircle,
} from "lucide-react";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-heading text-xl font-bold animate-pulse text-white">
          Loading data...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, users, recent_transactions } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

        <div className="neo-border neo-shadow p-4" style={{ background: "#FFCC00" }}>
          <TrendingUp size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#666" }}>
            Total Volume
          </p>
          <p className="font-heading text-lg font-bold">{formatRupiah(stats.total_volume)}</p>
        </div>

        <div className="neo-border neo-shadow p-4" style={{ background: "#F3E5F5" }}>
          <Database size={20} strokeWidth={2.5} className="mb-2" />
          <p className="text-xs font-heading font-bold uppercase" style={{ color: "#666" }}>
            Database Size
          </p>
          <p className="font-heading text-2xl font-bold">{stats.database_size}</p>
        </div>
      </div>

      {/* Two columns: Users + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Table */}
        <div className="neo-border p-5" style={{ background: "#FFFFFF" }}>
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={18} strokeWidth={2.5} />
            Semua Users ({users.length})
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {users.map((u) => (
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
                <div className="flex items-center gap-3 ml-3">
                  {u.has_telegram && (
                    <MessageCircle size={16} strokeWidth={2.5} style={{ color: "#0088cc" }} />
                  )}
                  <div
                    className="neo-border px-2 py-1 text-xs font-heading font-bold text-center"
                    style={{ background: "#E3F2FD", minWidth: 50 }}
                  >
                    {u.tx_count} tx
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-sm" style={{ color: "#999" }}>
                Belum ada user
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
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {recent_transactions.map((tx) => (
              <div key={tx.id} className="neo-border p-3" style={{ background: "#FAFAFA" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-heading text-sm font-bold truncate flex-1">
                    {tx.description || tx.category}
                  </p>
                  <span
                    className="font-heading text-sm font-bold ml-2"
                    style={{
                      color: tx.transaction_type === "INCOME" ? "#00C781" : "#FF3B30",
                    }}
                  >
                    {tx.transaction_type === "INCOME" ? "+" : "-"}
                    {formatRupiah(tx.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: "#666" }}>
                    {tx.user_name}{" "}
                    <span style={{ color: "#999" }}>({tx.user_email})</span>
                  </p>
                  <p className="text-xs" style={{ color: "#999" }}>
                    {tx.transaction_date}
                  </p>
                </div>
              </div>
            ))}
            {recent_transactions.length === 0 && (
              <p className="text-center text-sm" style={{ color: "#999" }}>
                Belum ada transaksi
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
