-- name: CreateGoal :one
INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, name, target_amount, current_amount, deadline, created_at;

-- name: ListGoalsByUser :many
SELECT id, user_id, name, target_amount, current_amount, deadline, created_at
FROM goals
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateGoal :one
UPDATE goals
SET name = $3, target_amount = $4, deadline = $5
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, name, target_amount, current_amount, deadline, created_at;

-- name: AddToGoal :one
UPDATE goals
SET current_amount = current_amount + $3
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, name, target_amount, current_amount, deadline, created_at;

-- name: DeleteGoal :exec
DELETE FROM goals
WHERE id = $1 AND user_id = $2;
