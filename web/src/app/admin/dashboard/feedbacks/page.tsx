"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, FeedbackItem } from "@/lib/api";
import {
  MessageSquare,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
} from "lucide-react";

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const totalPages = Math.ceil(total / perPage);

  const fetchData = useCallback(async (p: number) => {
    const res = await adminApi.feedbacks(p);
    setFeedbacks(res.feedbacks || []);
    setTotal(res.total);
    setPerPage(res.per_page);
  }, []);

  useEffect(() => {
    fetchData(page).finally(() => setLoading(false));
  }, [fetchData, page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(page);
    setRefreshing(false);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-heading text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 neo-border neo-shadow flex items-center justify-center"
            style={{ background: "#FFCC00" }}
          >
            <MessageSquare size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-wider">
              Feedbacks
            </h1>
            <p className="text-sm" style={{ color: "#666" }}>
              {total} feedback dari user
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="neo-border neo-shadow px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
          style={{ background: "#FFFFFF" }}
        >
          <RefreshCw
            size={14}
            strokeWidth={2.5}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Feedbacks List */}
      {feedbacks.length === 0 ? (
        <div
          className="neo-border neo-shadow p-12 text-center"
          style={{ background: "#FFFFFF" }}
        >
          <MessageSquare
            size={48}
            strokeWidth={1.5}
            className="mx-auto mb-4"
            style={{ color: "#CCC" }}
          />
          <p className="font-heading font-bold text-lg">Belum ada feedback</p>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Feedback dari user akan muncul di sini
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className="neo-border neo-shadow p-5"
              style={{ background: "#FFFFFF" }}
            >
              {/* User info + date */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 neo-border flex items-center justify-center flex-shrink-0 font-heading font-bold text-sm"
                    style={{ background: "#FAFAFA" }}
                  >
                    {fb.user_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-sm truncate">
                      {fb.user_name}
                    </p>
                    <div className="flex items-center gap-1 text-xs" style={{ color: "#666" }}>
                      <Mail size={10} strokeWidth={2.5} />
                      <span className="truncate">{fb.user_email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: "#999" }}>
                  <Calendar size={10} strokeWidth={2.5} />
                  {formatDate(fb.created_at)}
                </div>
              </div>

              {/* Rating */}
              {fb.rating && (
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      strokeWidth={2.5}
                      fill={fb.rating! >= star ? "#FFCC00" : "none"}
                      color={fb.rating! >= star ? "#FFCC00" : "#DDD"}
                    />
                  ))}
                </div>
              )}

              {/* Message */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {fb.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="neo-border neo-shadow w-10 h-10 flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-30 disabled:translate-y-0 disabled:shadow-none"
            style={{ background: "#FFFFFF" }}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="font-heading text-sm font-bold">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="neo-border neo-shadow w-10 h-10 flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-30 disabled:translate-y-0 disabled:shadow-none"
            style={{ background: "#FFFFFF" }}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
