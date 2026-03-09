"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { categories as categoriesApi, userSettings, type CategoryItem2 } from "@/lib/api";
import { Settings, User, Lock, Tags, Plus, Trash2, Crown, Coffee } from "lucide-react";

type CategoryType = "EXPENSE" | "INCOME";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("EXPENSE");
  const [categories, setCategories] = useState<CategoryItem2[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    loadCategories(categoryType);
  }, [categoryType]);

  const loadCategories = async (type: CategoryType) => {
    try {
      setLoadingCategories(true);
      const res = await categoriesApi.list(type);
      setCategories(res.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ambil kategori");
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setError(null);
      setMessage(null);
      await userSettings.updateProfile(name, email);
      await refreshProfile();
      setMessage("Profil berhasil diupdate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPassword(true);
      setError(null);
      setMessage(null);
      await userSettings.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password berhasil diubah");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ganti password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCategory(true);
      setError(null);
      setMessage(null);
      await categoriesApi.create(newCategory, categoryType);
      setNewCategory("");
      setMessage("Kategori berhasil ditambah");
      await loadCategories(categoryType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal tambah kategori");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setError(null);
      setMessage(null);
      await categoriesApi.delete(id);
      setDeleteCategoryConfirm(null);
      setMessage("Kategori berhasil dihapus");
      await loadCategories(categoryType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal hapus kategori");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 neo-border flex items-center justify-center" style={{ background: "#FFCC00" }}>
            <Settings size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase">Settings</h1>
            <p style={{ color: "#666" }}>Atur profil, password, dan kategori custom.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="neo-border p-4 font-medium" style={{ background: "#C7F9CC" }}>
          {message}
        </div>
      )}
      {error && (
        <div className="neo-border p-4 font-medium" style={{ background: "#FFD6D6" }}>
          {error}
        </div>
      )}

      {/* Plan Card */}
      <section
        className="neo-border neo-shadow p-6"
        style={{ background: profile?.plan === "pro" ? "#FFFBF5" : "#FFFFFF", borderColor: profile?.plan === "pro" ? "#FF6B00" : undefined }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 neo-border flex items-center justify-center"
              style={{ background: profile?.plan === "pro" ? "#FF6B00" : "#E5E5E5" }}
            >
              {profile?.plan === "pro" ? (
                <Crown size={20} strokeWidth={3} color="#fff" />
              ) : (
                <Coffee size={20} strokeWidth={3} />
              )}
            </div>
            <div>
              <div className="font-heading text-lg font-bold uppercase">
                Paket {profile?.plan === "pro" ? "Pro" : "Gratis"}
              </div>
              {profile?.plan === "pro" ? (
                <p className="text-sm" style={{ color: "#666" }}>
                  Semua fitur aktif ✨
                  {profile.subscription_expires_at && (
                    <span> · Berlaku sampai {new Date(profile.subscription_expires_at).toLocaleDateString("id-ID")}</span>
                  )}
                </p>
              ) : (
                <p className="text-sm" style={{ color: "#666" }}>
                  Upgrade ke Pro buat unlock semua fitur!
                </p>
              )}
            </div>
          </div>
          {profile?.plan !== "pro" && !profile?.early_access && (
            <a
              href="https://dna-indonesia.myr.id/m/gascatet-pro"
              target="_blank"
              rel="noopener noreferrer"
              className="neo-btn px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "#FF3B30" }}
            >
              Upgrade Pro ☕
            </a>
          )}
          {profile?.early_access && profile?.plan !== "pro" && (
            <span
              className="px-3 py-1.5 text-xs font-bold rounded"
              style={{ background: "#C7F9CC", color: "#00693E" }}
            >
              ✨ Early Access — Semua fitur aktif!
            </span>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="neo-border neo-shadow p-6" style={{ background: "#FFFFFF" }}>
          <div className="flex items-center gap-2 mb-4">
            <User size={20} strokeWidth={2.5} />
            <h2 className="font-heading text-xl font-bold uppercase">Profil</h2>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block font-heading text-sm font-bold uppercase mb-2">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full neo-border px-4 py-3 outline-none"
                style={{ background: "#FAFAFA" }}
              />
            </div>
            <div>
              <label className="block font-heading text-sm font-bold uppercase mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full neo-border px-4 py-3 outline-none"
                style={{ background: "#FAFAFA" }}
              />
              <p className="text-xs mt-1" style={{ color: "#999" }}>Mengubah email akan mengubah akun login kamu</p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="neo-border neo-shadow px-5 py-3 font-heading text-sm font-bold uppercase text-white disabled:opacity-50"
              style={{ background: "#121212" }}
            >
              {savingProfile ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </form>
        </section>

        <section className="neo-border neo-shadow p-6" style={{ background: "#FFFFFF" }}>
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} strokeWidth={2.5} />
            <h2 className="font-heading text-xl font-bold uppercase">Password</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block font-heading text-sm font-bold uppercase mb-2">Password Lama</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full neo-border px-4 py-3 outline-none"
                style={{ background: "#FAFAFA" }}
              />
            </div>
            <div>
              <label className="block font-heading text-sm font-bold uppercase mb-2">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full neo-border px-4 py-3 outline-none"
                style={{ background: "#FAFAFA" }}
                minLength={6}
              />
              <p className="text-xs mt-1" style={{ color: "#999" }}>Minimal 6 karakter</p>
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="neo-border neo-shadow px-5 py-3 font-heading text-sm font-bold uppercase text-white disabled:opacity-50"
              style={{ background: "#FF3B30" }}
            >
              {savingPassword ? "Menyimpan..." : "Ganti Password"}
            </button>
          </form>
        </section>
      </div>

      <section className="neo-border neo-shadow p-6" style={{ background: "#FFFFFF" }}>
        <div className="flex items-center gap-2 mb-4">
          <Tags size={20} strokeWidth={2.5} />
          <h2 className="font-heading text-xl font-bold uppercase">Custom Kategori</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: "#999" }}>Kategori ini bisa dipakai di Transaksi, Anggaran, dan Berulang</p>

        <div className="flex gap-3 mb-5">
          {(["EXPENSE", "INCOME"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setCategoryType(type)}
              className={`neo-border px-4 py-2 font-heading text-sm font-bold uppercase ${categoryType === type ? "neo-shadow text-white" : ""}`}
              style={categoryType === type ? { background: type === "EXPENSE" ? "#FF3B30" : "#00C781" } : { background: "#FFFFFF" }}
            >
              {type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={`Tambah kategori ${categoryType === "EXPENSE" ? "pengeluaran" : "pemasukan"}`}
            className="flex-1 neo-border px-4 py-3 outline-none"
            style={{ background: "#FAFAFA" }}
          />
          <button
            type="submit"
            disabled={savingCategory}
            className="neo-border neo-shadow px-5 py-3 font-heading text-sm font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#FFCC00" }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Tambah
          </button>
        </form>

        {loadingCategories ? (
          <div className="font-medium">Loading kategori...</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="neo-border p-4 flex items-center justify-between gap-3"
                style={{ background: "#FAFAFA" }}
              >
                <div>
                  <div className="font-heading font-bold uppercase text-sm">{category.name}</div>
                  <div className="text-xs" style={{ color: "#666" }}>{category.type}</div>
                </div>
                {deleteCategoryConfirm === category.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="neo-btn px-2 py-1 text-xs text-white"
                      style={{ background: "#FF3B30" }}
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => setDeleteCategoryConfirm(null)}
                      className="neo-btn px-2 py-1 text-xs"
                      style={{ background: "#F0F0F0" }}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteCategoryConfirm(category.id)}
                    className="w-10 h-10 neo-border flex items-center justify-center hover:opacity-80"
                    style={{ background: "#FFD6D6" }}
                    title="Hapus kategori"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
