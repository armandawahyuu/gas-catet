-- name: GetMonthlySummary :many
SELECT transaction_type, COALESCE(SUM(amount), 0)::BIGINT AS total
FROM transactions
WHERE user_id = $1
  AND transaction_date >= $2
  AND transaction_date < $3
GROUP BY transaction_type;

-- name: GetDailyBreakdown :many
SELECT
  DATE(transaction_date AT TIME ZONE 'Asia/Jakarta') AS tx_date,
  transaction_type,
  COALESCE(SUM(amount), 0)::BIGINT AS total
FROM transactions
WHERE user_id = $1
  AND transaction_date >= $2
  AND transaction_date < $3
GROUP BY tx_date, transaction_type
ORDER BY tx_date ASC;

-- name: GetMonthlyTrend :many
SELECT
  TO_CHAR(DATE_TRUNC('month', transaction_date AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM') AS tx_month,
  transaction_type,
  COALESCE(SUM(amount), 0)::BIGINT AS total
FROM transactions
WHERE user_id = $1
  AND transaction_date >= $2
  AND transaction_date < $3
GROUP BY tx_month, transaction_type
ORDER BY tx_month ASC;

-- name: GetTopDescriptions :many
SELECT
  description,
  COUNT(*)::BIGINT AS frequency,
  COALESCE(SUM(amount), 0)::BIGINT AS total_amount
FROM transactions
WHERE user_id = $1
  AND transaction_type = $2
  AND transaction_date >= $3
  AND transaction_date < $4
  AND description IS NOT NULL
  AND description != ''
GROUP BY description
ORDER BY total_amount DESC
LIMIT $5;

-- name: GetCategoryBreakdown :many
SELECT
  category,
  transaction_type,
  COALESCE(SUM(amount), 0)::BIGINT AS total,
  COUNT(*)::BIGINT AS count
FROM transactions
WHERE user_id = $1
  AND transaction_date >= $2
  AND transaction_date < $3
GROUP BY category, transaction_type
ORDER BY total DESC;

-- name: CountFeatureUsageToday :one
SELECT COUNT(*)::BIGINT AS count
FROM feature_usage
WHERE user_id = $1 AND feature = $2 AND used_at = CURRENT_DATE;

-- name: InsertFeatureUsage :exec
INSERT INTO feature_usage (user_id, feature) VALUES ($1, $2);
