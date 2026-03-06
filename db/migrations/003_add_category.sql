-- +migrate Up
ALTER TABLE transactions ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'Lainnya';

CREATE INDEX idx_transactions_category ON transactions(category);
