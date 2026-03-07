-- name: CreateTransaction :one
INSERT INTO transactions (user_id, amount, transaction_type, description, category, transaction_date, wallet_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, user_id, amount, transaction_type, description, category, transaction_date, wallet_id, created_at;

-- name: GetTransactionByID :one
SELECT t.id, t.user_id, t.amount, t.transaction_type, t.description, t.category, t.transaction_date, t.wallet_id, t.created_at, COALESCE(w.name, '') AS wallet_name
FROM transactions t
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE t.id = $1 AND t.user_id = $2;

-- name: ListTransactionsByUser :many
SELECT t.id, t.user_id, t.amount, t.transaction_type, t.description, t.category, t.transaction_date, t.wallet_id, t.created_at, COALESCE(w.name, '') AS wallet_name
FROM transactions t
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE t.user_id = $1
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListTransactionsByUserAndType :many
SELECT t.id, t.user_id, t.amount, t.transaction_type, t.description, t.category, t.transaction_date, t.wallet_id, t.created_at, COALESCE(w.name, '') AS wallet_name
FROM transactions t
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE t.user_id = $1 AND t.transaction_type = $2
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateTransaction :one
UPDATE transactions
SET amount = $3, transaction_type = $4, description = $5, category = $6, transaction_date = $7, wallet_id = $8
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, amount, transaction_type, description, category, transaction_date, wallet_id, created_at;

-- name: DeleteTransaction :exec
DELETE FROM transactions
WHERE id = $1 AND user_id = $2;

-- name: GetMonthlyTotal :many
SELECT transaction_type, COALESCE(SUM(amount), 0)::BIGINT AS total
FROM transactions
WHERE user_id = $1
  AND transaction_date >= $2
  AND transaction_date < $3
GROUP BY transaction_type;

-- name: ListTransactionsForExport :many
SELECT t.id, t.amount, t.transaction_type, t.description, t.category, t.transaction_date, COALESCE(w.name, '') AS wallet_name
FROM transactions t
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE t.user_id = $1
  AND t.transaction_date >= $2
  AND t.transaction_date < $3
ORDER BY t.transaction_date ASC, t.created_at ASC;

-- name: SearchTransactions :many
SELECT t.id, t.user_id, t.amount, t.transaction_type, t.description, t.category, t.transaction_date, t.wallet_id, t.created_at, COALESCE(w.name, '') AS wallet_name
FROM transactions t
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE t.user_id = $1
  AND (
    t.description ILIKE '%' || $2 || '%'
    OR t.category ILIKE '%' || $2 || '%'
    OR COALESCE(w.name, '') ILIKE '%' || $2 || '%'
  )
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT $3 OFFSET $4;
