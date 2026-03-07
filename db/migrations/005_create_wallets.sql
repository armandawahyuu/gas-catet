-- +migrate Up
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '💰',
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Add wallet_id to transactions (nullable for backward compat)
ALTER TABLE transactions ADD COLUMN wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);

-- Seed default wallets for existing users
INSERT INTO wallets (user_id, name, icon)
SELECT u.id, w.name, w.icon
FROM users u
CROSS JOIN (VALUES
    ('Cash', '💵'),
    ('Bank', '🏦'),
    ('E-Wallet', '📱')
) AS w(name, icon);

-- +migrate Down
ALTER TABLE transactions DROP COLUMN IF EXISTS wallet_id;
DROP TABLE IF EXISTS wallets;
