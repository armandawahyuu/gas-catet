"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminApi, AdminDashboard, AdminUser } from "@/lib/api";
import {
  Users,
  MessageCircle,
  Search,
  RefreshCw,
  Mail,
  Calendar,
  Receipt,
  ArrowUpDown,
  UserPlus,
  Activity,
} from "lucide-react";

type SortKey = "name" | "tx_count" | "created_at";
type SortDir = "asc" | "desc";

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    let list = [...data.users];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "tx_count") cmp = a.tx_count - b.tx_count;
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, search, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-heading text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { users, stats } = data;
  const tgCount = users.filter((u) => u.has_telegram).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Users size={28} strokeWidth={2.5} />
            Users
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Manajemen semua user GasCatet
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-border neo-shadow p-4" style={{ background: "#FFCC00" }}>
          <Users size={18} strokeWidth={2.5} className="mb-2" />
          <p className="font-heading text-2xl font-bold">{stats.total_users}</p>
          <p className="text-[10px] font-heading font-bold uppercase" style={{ color: "#333" }}>Total Users</p>
        </div>
        <div className="neo-border neo-shadow p-4" style={{ background: "#E8F5E9" }}>
          <UserPlus size={18} strokeWidth={2.5} className="mb-2" />
          <p className="font-heading text-2xl font-bold">+{stats.new_users_today}</p>
          <p className="text-[10px] font-heading font-bold uppercase" style={{ color: "#555" }}>Baru Hari Ini</p>
        </div>
        <div className="neo-border neo-shadow p-4" style={{ background: "#E0F7FA" }}>
          <MessageCircle size={18} strokeWidth={2.5} style={{ color: "#0088cc" }} className="mb-2" />
          <p className="font-heading text-2xl font-bold">{tgCount}</p>
          <p className="text-[10px] font-heading font-bold uppercase" style={{ color: "#555" }}>Telegram</p>
        </div>
        <div className="neo-border neo-shadow p-4" style={{ background: "#E3F2FD" }}>
          <Activity size={18} strokeWidth={2.5} className="mb-2" />
          <p className="font-heading text-2xl font-bold">{stats.active_users_7d}</p>
          <p className="text-[10px] font-heading font-bold uppercase" style={{ color: "#555" }}>Aktif 7 Hari</p>
        </div>
      </div>

      {/* Search + Sort Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
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
        <div className="flex items-center gap-2">
          <SortButton
            label="Nama"
            active={sortKey === "name"}
            dir={sortKey === "name" ? sortDir : undefined}
            onClick={() => toggleSort("name")}
          />
          <SortButton
            label="Transaksi"
            active={sortKey === "tx_count"}
            dir={sortKey === "tx_count" ? sortDir : undefined}
            onClick={() => toggleSort("tx_count")}
          />
          <SortButton
            label="Tanggal"
            active={sortKey === "created_at"}
            dir={sortKey === "created_at" ? sortDir : undefined}
            onClick={() => toggleSort("created_at")}
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs font-heading font-bold" style={{ color: "#999" }}>
        Menampilkan {sorted.length} dari {users.length} user
      </p>

      {/* Users list */}
      <div className="space-y-3">
        {sorted.map((u, i) => (
          <div
            key={u.id}
            className="neo-border p-4 flex items-center gap-4 transition-colors hover:bg-gray-50"
            style={{ background: "#FFFFFF" }}
          >
            {/* Avatar */}
            <div
              className="w-11 h-11 neo-border flex items-center justify-center shrink-0 font-heading text-lg font-bold"
              style={{ background: ["#FFCC00", "#E3F2FD", "#E8F5E9", "#FFF3E0", "#F3E5F5", "#E0F7FA", "#FFCDD2", "#FFF9C4"][i % 8] }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-heading text-base font-bold truncate">{u.name}</p>
                {u.has_telegram && (
                  <span className="neo-border px-1.5 py-0.5 text-[10px] font-heading font-bold shrink-0" style={{ background: "#E0F7FA", color: "#0088cc" }}>
                    TG
                  </span>
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
              className="neo-border px-4 py-2 text-center shrink-0"
              style={{ background: u.tx_count > 0 ? "#E3F2FD" : "#F5F5F5" }}
            >
              <Receipt size={14} strokeWidth={2.5} className="mx-auto mb-0.5" />
              <span className="text-xs font-heading font-bold">{u.tx_count} tx</span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
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

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir?: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-3 py-2 neo-border font-heading text-[11px] font-bold uppercase tracking-wider transition-all hover:translate-y-0.5"
      style={{ background: active ? "#FFCC00" : "#FFF" }}
    >
      {label}
      <ArrowUpDown size={12} strokeWidth={2.5} style={{ opacity: active ? 1 : 0.3 }} />
      {active && dir && (
        <span className="text-[9px]">{dir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );
}
