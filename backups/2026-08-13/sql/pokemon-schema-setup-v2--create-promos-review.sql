-- Pokemon Schema Setup v2 > node "Create promos_review"
-- Backup de 13/08/2026.

CREATE TABLE IF NOT EXISTS promos_review (id BIGSERIAL PRIMARY KEY, item_id TEXT, title TEXT, price_cents INTEGER, discount_pct NUMERIC(5,2), motivo TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_promos_review_status ON promos_review(status);
