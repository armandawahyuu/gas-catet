-- ============ CORE STATS ============

-- name: CountUsers :one
SELECT COUNT(*)::BIGINT AS total FROM users;

-- name: CountTransactions :one
SELECT COUNT(*)::BIGINT AS total FROM transactions;

-- name: CountActiveUsers7d :one
SELECT COUNT(DISTINCT user_id)::BIGINT AS total
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '7 days';

-- name: CountActiveUsers30d :one
SELECT COUNT(DISTINCT user_id)::BIGINT AS total
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days';

-- name: CountTelegramUsers :one
SELECT COUNT(*)::BIGINT AS total FROM users WHERE telegram_id IS NOT NULL;

-- name: NewUsersToday :one
SELECT COUNT(*)::BIGINT AS total FROM users WHERE created_at::date = CURRENT_DATE;

-- name: NewUsersThisWeek :one
SELECT COUNT(*)::BIGINT AS total FROM users WHERE created_at::date >= CURRENT_DATE - INTERVAL '7 days';

-- name: NewUsersThisMonth :one
SELECT COUNT(*)::BIGINT AS total FROM users WHERE created_at::date >= CURRENT_DATE - INTERVAL '30 days';

-- name: TransactionsToday :one
SELECT COUNT(*)::BIGINT AS total FROM transactions WHERE transaction_date = CURRENT_DATE;

-- name: GetDatabaseSize :one
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- name: AvgTxPerUser :one
SELECT COALESCE(ROUND(COUNT(t.id)::NUMERIC / NULLIF(COUNT(DISTINCT t.user_id), 0), 1), 0)::FLOAT8 AS avg_tx
FROM transactions t;

-- ============ PAGE VIEWS / VISITORS ============

-- name: InsertPageView :exec
INSERT INTO page_views (path, visitor_hash, user_agent, referrer, is_authenticated)
VALUES ($1, $2, $3, $4, $5);

-- name: TotalPageViewsToday :one
SELECT COUNT(*)::BIGINT AS total FROM page_views WHERE created_at::date = CURRENT_DATE;

-- name: UniqueVisitorsToday :one
SELECT COUNT(DISTINCT visitor_hash)::BIGINT AS total FROM page_views WHERE created_at::date = CURRENT_DATE;

-- name: UniqueVisitorsThisWeek :one
SELECT COUNT(DISTINCT visitor_hash)::BIGINT AS total FROM page_views WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- name: UniqueVisitorsThisMonth :one
SELECT COUNT(DISTINCT visitor_hash)::BIGINT AS total FROM page_views WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- name: TotalPageViewsAll :one
SELECT COUNT(*)::BIGINT AS total FROM page_views;

-- name: TotalUniqueVisitorsAll :one
SELECT COUNT(DISTINCT visitor_hash)::BIGINT AS total FROM page_views;

-- name: DailyPageViews :many
SELECT created_at::date::TEXT AS date_str,
       COUNT(*)::BIGINT AS views,
       COUNT(DISTINCT visitor_hash)::BIGINT AS unique_visitors
FROM page_views
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY created_at::date
ORDER BY created_at::date;

-- name: TopPages :many
SELECT path,
       COUNT(*)::BIGINT AS views,
       COUNT(DISTINCT visitor_hash)::BIGINT AS unique_visitors
FROM page_views
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY path
ORDER BY views DESC
LIMIT 10;

-- name: HourlyPageViews :many
SELECT EXTRACT(HOUR FROM created_at)::INT AS hour_of_day,
       COUNT(*)::BIGINT AS views
FROM page_views
WHERE created_at::date = CURRENT_DATE
GROUP BY hour_of_day
ORDER BY hour_of_day;

-- ============ USER GROWTH ============

-- name: UserGrowthDaily :many
SELECT created_at::date::TEXT AS date_str,
       COUNT(*)::BIGINT AS new_users
FROM users
GROUP BY created_at::date
ORDER BY created_at::date;

-- name: CumulativeUsers :many
SELECT date_str, SUM(new_users) OVER (ORDER BY date_str) AS cumulative
FROM (
  SELECT created_at::date::TEXT AS date_str,
         COUNT(*)::BIGINT AS new_users
  FROM users
  GROUP BY created_at::date
) sub
ORDER BY date_str;

-- ============ ENGAGEMENT ============

-- name: DailyActiveUsers :many
SELECT transaction_date::TEXT AS date_str,
       COUNT(DISTINCT user_id)::BIGINT AS active_users
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY transaction_date
ORDER BY transaction_date;

-- name: DailyTransactionCount :many
SELECT transaction_date::TEXT AS date_str,
       COUNT(*)::BIGINT AS tx_count
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY transaction_date
ORDER BY transaction_date;

-- ============ USERS LIST ============

-- name: ListAllUsers :many
SELECT u.id, u.email, u.name, u.telegram_id, u.created_at,
       COUNT(t.id)::BIGINT AS tx_count
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id, u.email, u.name, u.telegram_id, u.created_at
ORDER BY u.created_at DESC;

-- name: RecentTransactions :many
SELECT t.id, t.amount, t.transaction_type, t.description, t.category, t.transaction_date, t.created_at,
       u.name AS user_name, u.email AS user_email
FROM transactions t
JOIN users u ON u.id = t.user_id
ORDER BY t.created_at DESC
LIMIT 10;

-- ============ ANALYTICS ============

-- name: DailyVolume :many
SELECT
  TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date_str,
  COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END), 0)::BIGINT AS income,
  COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0)::BIGINT AS expense
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY transaction_date
ORDER BY transaction_date;

-- name: CategoryBreakdown :many
SELECT
  category,
  transaction_type,
  COALESCE(SUM(amount), 0)::BIGINT AS total_amount,
  COUNT(*)::BIGINT AS tx_count
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category, transaction_type
ORDER BY total_amount DESC;
