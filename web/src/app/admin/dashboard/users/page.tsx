"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, AdminDashboard } from "@/lib/api";
import {
  Users,
  MessageCircle,
  Search,
  RefreshCw,
  Mail,
  Calendar,
  Receipt,
} from "lucide-react";

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

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
        <div className="font-heading text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { users, stats } = data;

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Users size={24} strokeWidth={2.5} />
            Users
          </h1>
          <p className="text-sm" style={{ color: "#666" }}>
            {stats.total_users} total &middot; {stats.telegram_users} telegram &middot; {stats.new_users_today} baru hari ini
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          strokeWidth={2.5}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "#999" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-3 neo-border font-heading text-sm font-bold focus:outline-none"
          style={{ background: "#FFFFFF" }}
          placeholder="Cari nama atau email..."
        />
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="neo-border p-4 flex items-center justify-between gap-4"
            style={{ background: "#FFFFFF" }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-heading text-base font-bold truncate">{u.name}</p>
                {u.has_telegram && (
                  <MessageCircle size={16} strokeWidth={2.5} style={{ color: "#0088cc" }} />
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1 text-xs" style={{ color: "#666" }}>
                  <Mail size={12} strokeWidth={2} />
                  {u.email}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "#999" }}>
                  <Calendar size={12} strokeWidth={2} />
                  {new Date(u.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div
              className="neo-border px-3 py-2 text-center shrink-0"
              style={{ background: "#E3F2FD" }}
            >
              <Receipt size={14} strokeWidth={2.5} className="mx-auto mb-0.5" />
              <span className="text-xs font-heading font-bold">{u.tx_count} tx</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            className="neo-border p-8 text-center"
            style={{ background: "#FFFFFF" }}
          >
            <p className="text-sm font-heading" style={{ color: "#999" }}>
              {search ? "User tidak ditemukan" : "Belum ada user"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
