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
  unlinkTelegram: () =>
    request<Profile>("/api/user/link-telegram", { method: "DELETE" }),
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
  receipt_url: string;
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
  list: (params?: { type?: string; limit?: number; offset?: number; q?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    if (params?.q) q.set("q", params.q);
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
  today: () => request<{ total_income: number; total_expense: number; tx_count: number }>("/api/transactions/today"),
  exportCSV: (year: number, month: number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const q = new URLSearchParams({ year: String(year), month: String(month) });
    return fetch(`${API_BASE}/api/transactions/export?${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((res) => {
      if (!res.ok) throw new Error("Export gagal");
      return res.blob();
    });
  },
  uploadReceipt: (id: string, file: File) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const formData = new FormData();
    formData.append("receipt", file);
    return fetch(`${API_BASE}/api/transactions/${id}/receipt`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload gagal");
      return body as { message: string; receipt_url: string };
    });
  },
  deleteReceipt: (id: string) =>
    request<{ message: string }>(`/api/transactions/${id}/receipt`, { method: "DELETE" }),
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

// Budgets
export interface BudgetItem {
  id: string;
  category_name: string;
  amount: number;
  spent: number;
}

export interface BudgetsListResponse {
  budgets: BudgetItem[];
}

export const budgets = {
  list: () => request<BudgetsListResponse>("/api/budgets/"),
  upsert: (category_name: string, amount: number) =>
    request<BudgetItem>("/api/budgets/", {
      method: "POST",
      body: JSON.stringify({ category_name, amount }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/budgets/${id}`, { method: "DELETE" }),
};

// Recurring Transactions
export interface RecurringItem {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  category: string;
  wallet_id: string;
  wallet_name: string;
  frequency: string;
  next_run: string;
  is_active: boolean;
}

export interface RecurringListResponse {
  recurring: RecurringItem[];
}

export const recurringTx = {
  list: () => request<RecurringListResponse>("/api/recurring/"),
  create: (data: {
    amount: number;
    transaction_type: string;
    description: string;
    category: string;
    wallet_id: string;
    frequency: string;
    next_run: string;
  }) =>
    request<RecurringItem>("/api/recurring/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: {
    amount: number;
    transaction_type: string;
    description: string;
    category: string;
    wallet_id: string;
    frequency: string;
    next_run: string;
    is_active: boolean;
  }) =>
    request<RecurringItem>(`/api/recurring/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  toggle: (id: string) =>
    request<RecurringItem>(`/api/recurring/${id}/toggle`, { method: "PATCH" }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/recurring/${id}`, { method: "DELETE" }),
};

// Goals
export interface GoalItem {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
}

export interface GoalsListResponse {
  goals: GoalItem[];
}

export const goals = {
  list: () => request<GoalsListResponse>("/api/goals/"),
  create: (data: { name: string; target_amount: number; deadline?: string }) =>
    request<GoalItem>("/api/goals/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name: string; target_amount: number; deadline?: string }) =>
    request<GoalItem>(`/api/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  addAmount: (id: string, amount: number) =>
    request<GoalItem>(`/api/goals/${id}/add`, {
      method: "PATCH",
      body: JSON.stringify({ amount }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/goals/${id}`, { method: "DELETE" }),
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

// Transfers
export interface TransferItem {
  id: string;
  from_wallet_id: string;
  from_wallet_name: string;
  from_wallet_icon: string;
  to_wallet_id: string;
  to_wallet_name: string;
  to_wallet_icon: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface TransfersListResponse {
  transfers: TransferItem[];
}

export const transfers = {
  list: (limit = 20, offset = 0) =>
    request<TransfersListResponse>(
      `/api/transfers/?limit=${limit}&offset=${offset}`
    ),
  create: (
    from_wallet_id: string,
    to_wallet_id: string,
    amount: number,
    note: string
  ) =>
    request<TransferItem>("/api/transfers/", {
      method: "POST",
      body: JSON.stringify({ from_wallet_id, to_wallet_id, amount, note }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/api/transfers/${id}`, { method: "DELETE" }),
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

// Admin
export interface AdminOverviewStats {
  total_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  active_users_7d: number;
  active_users_30d: number;
  telegram_users: number;
  total_transactions: number;
  tx_today: number;
  avg_tx_per_user: number;
  database_size: string;
}

export interface AdminVisitorStats {
  page_views_today: number;
  unique_visitors_today: number;
  unique_visitors_week: number;
  unique_visitors_month: number;
  total_page_views: number;
  total_unique_visitors: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  has_telegram: boolean;
  tx_count: number;
  created_at: string;
}

export interface AdminRecentTx {
  id: string;
  amount: number;
  transaction_type: "INCOME" | "EXPENSE";
  description: string;
  category: string;
  transaction_date: string;
  user_name: string;
  user_email: string;
}

export interface AdminDashboard {
  stats: AdminOverviewStats;
  visitors: AdminVisitorStats;
  users: AdminUser[];
  recent_transactions: AdminRecentTx[];
}

export interface AdminDailyPageView {
  date: string;
  views: number;
  unique_visitors: number;
}

export interface AdminTopPage {
  path: string;
  views: number;
  unique_visitors: number;
}

export interface AdminHourlyView {
  hour: number;
  views: number;
}

export interface AdminUserGrowth {
  date: string;
  new_users: number;
}

export interface AdminCumulativeUser {
  date: string;
  cumulative: number;
}

export interface AdminDailyActive {
  date: string;
  active_users: number;
}

export interface AdminDailyTxCount {
  date: string;
  tx_count: number;
}

export interface AdminGrowth {
  daily_page_views: AdminDailyPageView[];
  top_pages: AdminTopPage[];
  hourly_views: AdminHourlyView[];
  user_growth: AdminUserGrowth[];
  cumulative_users: AdminCumulativeUser[];
  daily_active_users: AdminDailyActive[];
  daily_tx_count: AdminDailyTxCount[];
}

export const adminApi = {
  check: () => request<{ is_admin: boolean }>("/api/admin/check"),
  dashboard: () => request<AdminDashboard>("/api/admin/dashboard"),
  growth: () => request<AdminGrowth>("/api/admin/growth"),
};

// Page view tracking (public, no auth)
export const trackPageView = (path: string, referrer?: string) => {
  fetch(`${API_BASE}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, referrer: referrer || "" }),
  }).catch(() => {});
};
