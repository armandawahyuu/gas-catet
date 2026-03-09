"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth as authApi, user as userApi, type Profile } from "@/lib/api";

interface AuthContextType {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      setToken(stored);
      userApi
        .profile()
        .then(setProfile)
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem("token", res.token);
    setToken(res.token);
    const p = await userApi.profile();
    setProfile(p);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await authApi.register(email, password, name);
    localStorage.setItem("token", res.token);
    setToken(res.token);
    const p = await userApi.profile();
    setProfile(p);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setProfile(null);
    window.location.href = "/login";
  };

  const refreshProfile = async () => {
    const p = await userApi.profile();
    setProfile(p);
  };

  // User has Pro access if: plan is "pro" OR early_access is enabled
  const isPro = profile?.plan === "pro" || profile?.early_access === true;

  return (
    <AuthContext.Provider
      value={{ token, profile, loading, isPro, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
