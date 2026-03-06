-- name: ListCategoriesByUser :many
SELECT id, user_id, name, type, created_at
FROM categories
WHERE user_id = $1
ORDER BY type, name;

-- name: ListCategoriesByUserAndType :many
SELECT id, user_id, name, type, created_at
FROM categories
WHERE user_id = $1 AND type = $2
ORDER BY name;

-- name: CreateCategory :one
INSERT INTO categories (user_id, name, type)
VALUES ($1, $2, $3)
RETURNING id, user_id, name, type, created_at;

-- name: DeleteCategory :exec
DELETE FROM categories
WHERE id = $1 AND user_id = $2;

-- name: SeedDefaultCategories :exec
INSERT INTO categories (user_id, name, type) VALUES
    ($1, 'Makan', 'EXPENSE'), ($1, 'Transport', 'EXPENSE'), ($1, 'Belanja', 'EXPENSE'),
    ($1, 'Rumah', 'EXPENSE'), ($1, 'Hiburan', 'EXPENSE'), ($1, 'Kesehatan', 'EXPENSE'),
    ($1, 'Pendidikan', 'EXPENSE'), ($1, 'Lainnya', 'EXPENSE'),
    ($1, 'Gaji', 'INCOME'), ($1, 'Freelance', 'INCOME'), ($1, 'Investasi', 'INCOME'),
    ($1, 'Hadiah', 'INCOME'), ($1, 'Lainnya', 'INCOME')
ON CONFLICT (user_id, name, type) DO NOTHING;
