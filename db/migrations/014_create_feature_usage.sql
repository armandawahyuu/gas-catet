-- Feature usage tracking (e.g. AI Roast daily limit for free users)
CREATE TABLE IF NOT EXISTS feature_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    used_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_feature_usage_user_feature_date ON feature_usage(user_id, feature, used_at);
