-- +migrate Up
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    UNIQUE(user_id, name, type)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Seed default categories for existing users
INSERT INTO categories (user_id, name, type)
SELECT u.id, c.name, c.type
FROM users u
CROSS JOIN (VALUES
    ('Makan', 'EXPENSE'), ('Transport', 'EXPENSE'), ('Belanja', 'EXPENSE'),
    ('Rumah', 'EXPENSE'), ('Hiburan', 'EXPENSE'), ('Kesehatan', 'EXPENSE'),
    ('Pendidikan', 'EXPENSE'), ('Lainnya', 'EXPENSE'),
    ('Gaji', 'INCOME'), ('Freelance', 'INCOME'), ('Investasi', 'INCOME'),
    ('Hadiah', 'INCOME'), ('Lainnya', 'INCOME')
) AS c(name, type);

-- +migrate Down
DROP TABLE IF EXISTS categories;
