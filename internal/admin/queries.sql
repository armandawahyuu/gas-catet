-- name: CountUsers :one
SELECT COUNT(*)::BIGINT AS total FROM users;

-- name: CountTransactions :one
SELECT COUNT(*)::BIGINT AS total FROM transactions;

-- name: CountActiveUsers :one
SELECT COUNT(DISTINCT user_id)::BIGINT AS total
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '7 days';

-- name: TotalVolume :one
SELECT COALESCE(SUM(amount), 0)::BIGINT AS total FROM transactions;

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

-- name: GetDatabaseSize :one
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
