-- name: CreatePaymentOrder :one
INSERT INTO payment_orders (user_id, tripay_reference, merchant_ref, method, amount, status, checkout_url, pay_code, expired_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, user_id, tripay_reference, merchant_ref, method, amount, status, checkout_url, pay_code, expired_at, paid_at, created_at;

-- name: GetPaymentOrderByMerchantRef :one
SELECT id, user_id, tripay_reference, merchant_ref, method, amount, status, checkout_url, pay_code, expired_at, paid_at, created_at
FROM payment_orders
WHERE merchant_ref = $1;

-- name: UpdatePaymentOrderStatus :exec
UPDATE payment_orders
SET status = $2, paid_at = $3, tripay_reference = $4
WHERE merchant_ref = $1;

-- name: GetLatestPendingOrder :one
SELECT id, user_id, tripay_reference, merchant_ref, method, amount, status, checkout_url, pay_code, expired_at, paid_at, created_at
FROM payment_orders
WHERE user_id = $1 AND status = 'UNPAID' AND expired_at > NOW()
ORDER BY created_at DESC
LIMIT 1;
