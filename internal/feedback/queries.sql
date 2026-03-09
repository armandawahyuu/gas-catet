-- name: CreateFeedback :one
INSERT INTO feedbacks (user_id, message, rating)
VALUES ($1, $2, $3)
RETURNING id, user_id, message, rating, created_at;

-- name: CountUserFeedbackToday :one
SELECT COUNT(*) FROM feedbacks
WHERE user_id = $1
AND created_at >= CURRENT_DATE;

-- name: ListFeedbacks :many
SELECT f.id, f.user_id, f.message, f.rating, f.created_at,
       u.name AS user_name, u.email AS user_email
FROM feedbacks f
JOIN users u ON u.id = f.user_id
ORDER BY f.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountFeedbacks :one
SELECT COUNT(*) FROM feedbacks;
