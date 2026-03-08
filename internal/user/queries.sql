-- name: CreateUser :one
INSERT INTO users (email, password_hash, name)
VALUES ($1, $2, $3)
RETURNING id, email, name, telegram_id, created_at;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, name, telegram_id, created_at
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT id, email, name, telegram_id, created_at
FROM users
WHERE id = $1;

-- name: GetUserByTelegramID :one
SELECT id, email, name, telegram_id, created_at
FROM users
WHERE telegram_id = $1;

-- name: LinkTelegram :one
UPDATE users
SET telegram_id = $2
WHERE id = $1
RETURNING id, email, name, telegram_id, created_at;

-- name: UnlinkTelegram :one
UPDATE users
SET telegram_id = NULL
WHERE id = $1
RETURNING id, email, name, telegram_id, created_at;

-- name: UpdateProfile :one
UPDATE users
SET name = $2, email = $3
WHERE id = $1
RETURNING id, email, name, telegram_id, created_at;

-- name: UpdatePassword :exec
UPDATE users
SET password_hash = $2
WHERE id = $1;

-- name: ListLinkedTelegramUsers :many
SELECT id, email, name, telegram_id, created_at
FROM users
WHERE telegram_id IS NOT NULL;
