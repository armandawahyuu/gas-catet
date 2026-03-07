-- name: ListWalletsByUser :many
SELECT id, user_id, name, icon, balance, created_at
FROM wallets
WHERE user_id = $1
ORDER BY created_at ASC;

-- name: GetWalletByID :one
SELECT id, user_id, name, icon, balance, created_at
FROM wallets
WHERE id = $1 AND user_id = $2;

-- name: CreateWallet :one
INSERT INTO wallets (user_id, name, icon)
VALUES ($1, $2, $3)
RETURNING id, user_id, name, icon, balance, created_at;

-- name: UpdateWallet :one
UPDATE wallets
SET name = $3, icon = $4
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, name, icon, balance, created_at;

-- name: DeleteWallet :exec
DELETE FROM wallets
WHERE id = $1 AND user_id = $2;

-- name: UpdateWalletBalance :exec
UPDATE wallets
SET balance = balance + $2
WHERE id = $1;

-- name: GetWalletsTotalBalance :one
SELECT COALESCE(SUM(balance), 0)::BIGINT AS total
FROM wallets
WHERE user_id = $1;

-- name: SeedDefaultWallets :exec
INSERT INTO wallets (user_id, name, icon) VALUES
    ($1, 'Cash', '💵'),
    ($1, 'Bank', '🏦'),
    ($1, 'E-Wallet', '📱')
ON CONFLICT (user_id, name) DO NOTHING;
