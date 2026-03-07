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

-- name: SetWalletBalance :exec
UPDATE wallets
SET balance = $3
WHERE id = $1 AND user_id = $2;

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

-- name: CreateTransfer :one
INSERT INTO transfers (user_id, from_wallet_id, to_wallet_id, amount, note)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, from_wallet_id, to_wallet_id, amount, note, created_at;

-- name: ListTransfersByUser :many
SELECT t.id, t.user_id, t.from_wallet_id, t.to_wallet_id, t.amount, t.note, t.created_at,
       fw.name AS from_wallet_name, fw.icon AS from_wallet_icon,
       tw.name AS to_wallet_name, tw.icon AS to_wallet_icon
FROM transfers t
JOIN wallets fw ON fw.id = t.from_wallet_id
JOIN wallets tw ON tw.id = t.to_wallet_id
WHERE t.user_id = $1
ORDER BY t.created_at DESC
LIMIT $2 OFFSET $3;

-- name: DeleteTransfer :one
DELETE FROM transfers
WHERE id = $1 AND user_id = $2
RETURNING from_wallet_id, to_wallet_id, amount;
