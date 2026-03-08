-- +migrate Up
ALTER TABLE transactions ADD COLUMN receipt_url TEXT DEFAULT '';
