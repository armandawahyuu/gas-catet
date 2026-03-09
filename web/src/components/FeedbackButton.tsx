"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Star, Send } from "lucide-react";
import { feedbackApi } from "@/lib/api";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    try {
      await feedbackApi.submit(message.trim(), rating || undefined);
      setSuccess(true);
      setMessage("");
      setRating(0);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim feedback";
      if (msg.includes("limit") || msg.includes("429")) {
        setError("Kamu sudah mengirim feedback hari ini. Coba lagi besok ya!");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setError(""); setSuccess(false); }}
        className="fixed bottom-6 right-6 z-50 neo-border neo-shadow w-14 h-14 flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
        style={{ background: "#FFCC00" }}
        title="Kirim Feedback"
      >
        <MessageSquarePlus size={24} strokeWidth={2.5} color="#121212" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md neo-border neo-shadow p-6"
            style={{ background: "#FFFFFF" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider">
                Kirim Feedback
              </h3>
              <button
                onClick={() => !loading && setOpen(false)}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 mx-auto mb-4 neo-border flex items-center justify-center"
                  style={{ background: "#00C781" }}
                >
                  <span className="text-2xl">✓</span>
                </div>
                <p className="font-heading font-bold text-lg">Terima kasih!</p>
                <p className="text-sm mt-1" style={{ color: "#666" }}>
                  Feedback kamu sudah terkirim
                </p>
              </div>
            ) : (
              <>
                {/* Rating */}
                <div className="mb-4">
                  <label className="font-heading text-xs font-bold uppercase tracking-wider block mb-2">
                    Rating (opsional)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star === rating ? 0 : star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          strokeWidth={2.5}
                          fill={(hoverRating || rating) >= star ? "#FFCC00" : "none"}
                          color={(hoverRating || rating) >= star ? "#FFCC00" : "#CCC"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="mb-4">
                  <label className="font-heading text-xs font-bold uppercase tracking-wider block mb-2">
                    Pesan <span style={{ color: "#FF3B30" }}>*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                    placeholder="Tulis feedback, saran, atau masukan kamu di sini..."
                    rows={4}
                    className="w-full neo-border p-3 text-sm resize-none focus:outline-none"
                    style={{ background: "#FAFAFA" }}
                  />
                  <div className="text-right text-xs mt-1" style={{ color: "#999" }}>
                    {message.length}/1000
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="neo-border p-3 mb-4 text-sm font-bold"
                    style={{ background: "#FF3B30", color: "#fff" }}
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || loading}
                  className="w-full neo-border neo-shadow px-6 py-3 font-heading text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                  style={{ background: "#FFCC00", color: "#121212" }}
                >
                  <Send size={16} strokeWidth={2.5} />
                  {loading ? "Mengirim..." : "Kirim Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
