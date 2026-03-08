-- +migrate Up
ALTER TABLE users
    ADD COLUMN plan VARCHAR(10) NOT NULL DEFAULT 'free',
    ADD COLUMN mayar_customer_id VARCHAR(255),
    ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_mayar_customer_id ON users(mayar_customer_id);
