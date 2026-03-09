-- +migrate Up
CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tripay_reference VARCHAR(100) UNIQUE,
    merchant_ref VARCHAR(100) UNIQUE NOT NULL,
    method VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    checkout_url TEXT,
    pay_code TEXT,
    expired_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_merchant_ref ON payment_orders(merchant_ref);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
