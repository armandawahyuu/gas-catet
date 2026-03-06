-- name: CreateTransaction :one
INSERT INTO transactions (user_id, amount, transaction_type, description, category, transaction_date)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, user_id, amount, transaction_type, description, category, transaction_date, created_at;

-- name: GetTransactionByID :one
SELECT id, user_id, amount, transaction_type, description, category, transaction_date, created_at
FROM transactions
WHERE id = $1 AND user_id = $2;

-- name: ListTransactionsByUser :many
SELECT id, user_id, amount, transaction_type, description, category, transaction_date, created_at
FROM transactions
WHERE user_id = $1
ORDER BY transaction_date DESC
LIMIT $2 OFFSET $3;

-- name: ListTransactionsByUserAndType :many
SELECT id, user_id, amount, transaction_type, description, category, transaction_date, created_at
FROM transactions
WHERE user_id = $1 AND transaction_type = $2
ORDER BY transaction_date DESC
LIMIT $3 OFFSET $4;

-- name: UpdateTransaction :one
UPDATE transactions
SET amount = $3, transaction_type = $4, description = $5, category = $6, transaction_date = $7
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, amount, transaction_type, description, category, transaction_date, created_at;

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
