const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export const auth = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
};

// User
export interface Profile {
  id: string;
  email: string;
  name: string;
  telegram_id: number | null;
  created_at: string;
}

export interface LinkTokenResponse {
  link_token: string;
  expires_in: string;
}

export const user = {
  profile: () => request<Profile>("/api/user/profile"),
  linkTelegram: () =>
    request<LinkTokenResponse>("/api/user/link-telegram", { method: "POST" }),
};

// Transactions
export interface Transaction {
  id: string;
  amount: number;
  transaction_type: "INCOME" | "EXPENSE";
  description: string;
  category: string;
  transaction_date: string;
  wallet_id: string;
  wallet_name: string;
  created_at: string;
}

export interface TransactionList {
  transactions: Transaction[];
  count: number;
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export const transactions = {
  list: (params?: { type?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request<TransactionList>(`/api/transactions/?${q}`);
  },
  create: (data: {
    amount: number;
    transaction_type: string;
    description: string;
    category: string;
    transaction_date: string;
    wallet_id?: string;
  }) =>
    request<Transaction>("/api/transactions/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: {
      amount: number;
      transaction_type: string;
      description: string;
      category: string;
      transaction_date: string;
      wallet_id?: string;
    }
  ) =>
    request<Transaction>(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  summary: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    return request<TransactionSummary>(`/api/transactions/summary?${q}`);
  },
};

// Analytics
export interface AnalyticsSummary {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface DailyItem {
  date: string;
  income: number;
  expense: number;
}

export interface DailyBreakdown {
  year: number;
  month: number;
  days: DailyItem[];
}

export interface TrendItem {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface TrendResponse {
  months: TrendItem[];
}

export interface TopItem {
  description: string;
  frequency: number;
  total_amount: number;
}

export interface TopExpensesResponse {
  year: number;
  month: number;
  items: TopItem[];
}

export interface CategoryItem {
  category: string;
  type: string;
  total: number;
  count: number;
}

export interface CategoryBreakdownResponse {
  year: number;
  month: number;
  items: CategoryItem[];
}

export const analytics = {
  summary: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    return request<AnalyticsSummary>(`/api/analytics/summary?${q}`);
  },
  daily: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    return request<DailyBreakdown>(`/api/analytics/daily?${q}`);
  },
  trend: (months?: number) => {
    const q = new URLSearchParams();
    if (months) q.set("months", String(months));
    return request<TrendResponse>(`/api/analytics/trend?${q}`);
  },
  topExpenses: (year?: number, month?: number, limit?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    if (limit) q.set("limit", String(limit));
    return request<TopExpensesResponse>(`/api/analytics/top-expenses?${q}`);
  },
  categories: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    return request<CategoryBreakdownResponse>(`/api/analytics/categories?${q}`);
  },
};

// Telegram
export interface TelegramInfo {
  enabled: boolean;
  username: string;
}

export const telegram = {
  info: () => request<TelegramInfo>("/api/telegram/info"),
};

// Categories
export interface CategoryItem2 {
  id: string;
  name: string;
  type: string;
}

export interface CategoriesListResponse {
  categories: CategoryItem2[];
}

export const categories = {
  list: (type?: string) => {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    return request<CategoriesListResponse>(`/api/categories/?${q}`);
  },
  create: (name: string, type: string) =>
    request<CategoryItem2>("/api/categories/", {
      method: "POST",
      body: JSON.stringify({ name, type }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/categories/${id}`, { method: "DELETE" }),
};

// Wallets
export interface WalletItem {
  id: string;
  name: string;
  icon: string;
  balance: number;
}

export interface WalletsListResponse {
  wallets: WalletItem[];
  total_balance: number;
}

export const wallets = {
  list: () => request<WalletsListResponse>("/api/wallets/"),
  create: (name: string, icon: string) =>
    request<WalletItem>("/api/wallets/", {
      method: "POST",
      body: JSON.stringify({ name, icon }),
    }),
  update: (id: string, name: string, icon: string) =>
    request<WalletItem>(`/api/wallets/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, icon }),
    }),
  setBalance: (id: string, balance: number) =>
    request<{ message: string }>(`/api/wallets/${id}/balance`, {
      method: "PATCH",
      body: JSON.stringify({ balance }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/wallets/${id}`, { method: "DELETE" }),
};

// User profile update
export const userSettings = {
  updateProfile: (name: string, email: string) =>
    request<Profile>("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify({ name, email }),
    }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/api/user/password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    }),
};
