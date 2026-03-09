"use client";

import { useEffect, useState } from "react";
import {
  goals as goalsApi,
  type GoalItem,
} from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { Target, Plus, Trash2, X, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UpgradePrompt } from "@/components/UpgradePrompt";

export default function GoalsPage() {
  const { isPro } = useAuth();
  const [goalList, setGoalList] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAddAmount, setShowAddAmount] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState<GoalItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Add amount state
  const [addAmountValue, setAddAmountValue] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await goalsApi.list();
      setGoalList(res.goals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      const data: { name: string; target_amount: number; deadline?: string } = {
        name: formName,
        target_amount: parseInt(formTarget),
      };
      if (formDeadline) data.deadline = formDeadline;

      if (editGoal) {
        await goalsApi.update(editGoal.id, data);
        setMessage("Target berhasil diperbarui!");
      } else {
        await goalsApi.create(data);
        setMessage("Target berhasil dibuat!");
      }
      setShowForm(false);
      setEditGoal(null);
      setFormName("");
      setFormTarget("");
      setFormDeadline("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan target");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddAmount = async (id: string) => {
    setAddLoading(true);
    setError(null);
    try {
      await goalsApi.addAmount(id, parseInt(addAmountValue));
      setShowAddAmount(null);
      setAddAmountValue("");
      setMessage("Tabungan berhasil ditambahkan!");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah tabungan");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await goalsApi.delete(id);
      setDeleteConfirm(null);
      setMessage("Target berhasil dihapus");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal hapus target");
    }
  };

  const openEdit = (goal: GoalItem) => {
    setEditGoal(goal);
    setFormName(goal.name);
    setFormTarget(goal.target_amount.toString());
    setFormDeadline(goal.deadline || "");
    setShowForm(true);
    setError(null);
  };

  const getPercentage = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getBarColor = (pct: number) => {
    if (pct >= 100) return "#00C781";
    if (pct >= 50) return "#FFCC00";
    return "#FF3B30";
  };

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const totalTarget = goalList.reduce((s, g) => s + g.target_amount, 0);
  const totalCurrent = goalList.reduce((s, g) => s + g.current_amount, 0);

  if (!isPro) {
    return <UpgradePrompt feature="Target Tabungan" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="font-heading text-xl font-bold animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 neo-border flex items-center justify-center"
            style={{ background: "#00C781" }}
          >
            <Target size={24} strokeWidth={3} color="white" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Target Tabungan
            </h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>
              Buat target tabungan dan catat progresnya secara manual
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditGoal(null);
            setFormName("");
            setFormTarget("");
            setFormDeadline("");
            setError(null);
          }}
          className="neo-btn px-3 py-2 sm:px-5 sm:py-3 flex items-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm"
          style={{ background: "#00C781" }}
        >
          <Plus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
          Tambah Target
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className="neo-border p-3 mb-4 font-heading text-sm font-bold"
          style={{ background: "#00C781", color: "white" }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="neo-border p-3 mb-4 font-heading text-sm font-bold"
          style={{ background: "#FF3B30", color: "white" }}
        >
          {error}
        </div>
      )}

      {/* Summary card */}
      {goalList.length > 0 && (
        <div
          className="neo-border neo-shadow p-5 mb-6"
          style={{ background: "#FFFFFF" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#666" }}>
                Total Target
              </p>
              <p className="font-heading text-xl font-bold mt-1">
                {formatRupiah(totalTarget)}
              </p>
            </div>
            <div>
              <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#666" }}>
                Terkumpul
              </p>
              <p className="font-heading text-xl font-bold mt-1" style={{ color: "#00C781" }}>
                {formatRupiah(totalCurrent)}
              </p>
            </div>
            <div>
              <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: "#666" }}>
                Sisa
              </p>
              <p className="font-heading text-xl font-bold mt-1" style={{ color: "#FF3B30" }}>
                {formatRupiah(totalTarget - totalCurrent)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div
              className="w-full h-3 neo-border overflow-hidden"
              style={{ background: "#F0F0F0" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${getPercentage(totalCurrent, totalTarget)}%`,
                  background: getBarColor(getPercentage(totalCurrent, totalTarget)),
                }}
              />
            </div>
            <p className="text-xs mt-1 text-right font-heading font-bold" style={{ color: "#666" }}>
              {totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0}% tercapai
            </p>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goalList.length === 0 ? (
        <div
          className="neo-border neo-shadow p-8 text-center"
          style={{ background: "#FFFFFF" }}
        >
          <Target size={48} className="mx-auto mb-3" style={{ color: "#CCC" }} />
          <p className="font-heading text-lg font-bold">Belum ada target</p>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Buat target tabungan, lalu tambahkan nominal yang sudah kamu tabung secara manual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goalList.map((goal) => {
            const pct = getPercentage(goal.current_amount, goal.target_amount);
            const barColor = getBarColor(pct);
            const isComplete = goal.current_amount >= goal.target_amount;
            const daysLeft = getDaysLeft(goal.deadline);

            return (
              <div
                key={goal.id}
                className="neo-border neo-shadow p-4"
                style={{ background: isComplete ? "#F0FFF4" : "#FFFFFF" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wider">
                      {goal.name}
                    </h3>
                    {isComplete && (
                      <span
                        className="neo-border px-2 py-0.5 text-xs font-heading font-bold text-white"
                        style={{ background: "#00C781" }}
                      >
                        TERCAPAI!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isComplete && (
                      <button
                        onClick={() => {
                          setShowAddAmount(goal.id);
                          setAddAmountValue("");
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Tambah Tabungan"
                      >
                        <TrendingUp size={16} style={{ color: "#00C781" }} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(goal)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors text-xs font-heading font-bold"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    {deleteConfirm === goal.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="neo-btn px-3 py-1 text-xs text-white"
                          style={{ background: "#FF3B30" }}
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="neo-btn px-3 py-1 text-xs"
                          style={{ background: "#F0F0F0" }}
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(goal.id)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Trash2 size={16} style={{ color: "#FF3B30" }} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-heading text-lg font-bold" style={{ color: "#00C781" }}>
                    {formatRupiah(goal.current_amount)}
                  </span>
                  <span className="text-sm" style={{ color: "#666" }}>
                    / {formatRupiah(goal.target_amount)}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  className="w-full h-3 neo-border overflow-hidden"
                  style={{ background: "#F0F0F0" }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: barColor,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-heading font-bold" style={{ color: "#666" }}>
                    {Math.round(pct)}% tercapai
                  </span>
                  {daysLeft !== null && (
                    <span
                      className="text-xs font-heading font-bold"
                      style={{ color: daysLeft <= 7 ? "#FF3B30" : "#666" }}
                    >
                      {daysLeft > 0 ? `${daysLeft} hari lagi` : daysLeft === 0 ? "Hari ini!" : "Lewat deadline"}
                    </span>
                  )}
                </div>

                {/* Add amount inline form */}
                {showAddAmount === goal.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Jumlah yang sudah ditabung"
                      value={addAmountValue}
                      onChange={(e) => setAddAmountValue(e.target.value)}
                      className="flex-1 neo-border px-3 py-2 text-sm font-heading focus:outline-none"
                      style={{ background: "#FFFFFF" }}
                    />
                    <button
                      onClick={() => handleAddAmount(goal.id)}
                      disabled={addLoading || !addAmountValue}
                      className="neo-btn px-4 py-2 text-xs text-white font-heading font-bold disabled:opacity-50"
                      style={{ background: "#00C781" }}
                    >
                      {addLoading ? "..." : "Tambah"}
                    </button>
                    <button
                      onClick={() => setShowAddAmount(null)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div
            className="neo-border neo-shadow w-full max-w-md p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold">
                {editGoal ? "Edit Target" : "Target Baru"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditGoal(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-heading font-bold uppercase tracking-wider block mb-1">
                  Nama Target
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Dana Darurat"
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-heading font-bold uppercase tracking-wider block mb-1">
                  Target Nominal
                </label>
                <input
                  type="number"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="10000000"
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-heading font-bold uppercase tracking-wider block mb-1">
                  Deadline (opsional)
                </label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="w-full neo-border px-3 py-2 font-heading text-sm focus:outline-none"
                />
                <p className="text-xs mt-1" style={{ color: "#999" }}>Tanggal target harus tercapai. Bisa dikosongkan.</p>
              </div>
              <button
                type="submit"
                disabled={formLoading || !formName || !formTarget}
                className="w-full neo-btn py-3 text-white font-heading font-bold disabled:opacity-50"
                style={{ background: "#00C781" }}
              >
                {formLoading ? "Menyimpan..." : editGoal ? "Perbarui Target" : "Buat Target"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
