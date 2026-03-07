-- name: CreateRecurring :one
INSERT INTO recurring_transactions (user_id, amount, transaction_type, description, category, wallet_id, frequency, next_run)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, user_id, amount, transaction_type, description, category, wallet_id, frequency, next_run, is_active, created_at;

-- name: ListRecurringByUser :many
SELECT r.id, r.user_id, r.amount, r.transaction_type, r.description, r.category, r.wallet_id, r.frequency, r.next_run, r.is_active, r.created_at, COALESCE(w.name, '') AS wallet_name
FROM recurring_transactions r
LEFT JOIN wallets w ON r.wallet_id = w.id
WHERE r.user_id = $1
ORDER BY r.is_active DESC, r.next_run ASC;

-- name: UpdateRecurring :one
UPDATE recurring_transactions
SET amount = $3, transaction_type = $4, description = $5, category = $6, wallet_id = $7, frequency = $8, next_run = $9, is_active = $10
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, amount, transaction_type, description, category, wallet_id, frequency, next_run, is_active, created_at;

-- name: DeleteRecurring :exec
DELETE FROM recurring_transactions
WHERE id = $1 AND user_id = $2;

-- name: ToggleRecurring :one
UPDATE recurring_transactions
SET is_active = NOT is_active
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, amount, transaction_type, description, category, wallet_id, frequency, next_run, is_active, created_at;

-- name: ListDueRecurring :many
SELECT r.id, r.user_id, r.amount, r.transaction_type, r.description, r.category, r.wallet_id, r.frequency, r.next_run, r.is_active, r.created_at
FROM recurring_transactions r
WHERE r.is_active = true AND r.next_run <= $1;

-- name: UpdateNextRun :exec
UPDATE recurring_transactions
SET next_run = $2
WHERE id = $1;
