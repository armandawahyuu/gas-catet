-- +migrate Up
CREATE TABLE page_views (
    id BIGSERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    referrer TEXT DEFAULT '',
    is_authenticated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_views_created_at ON page_views (created_at);
CREATE INDEX idx_page_views_visitor_hash ON page_views (visitor_hash);
CREATE INDEX idx_page_views_path ON page_views (path);
