-- Pokemon Schema Setup v2 > node "Create promos_erros"
-- Backup de 13/08/2026.

CREATE TABLE IF NOT EXISTS promos_erros (id BIGSERIAL PRIMARY KEY, item_id TEXT, payload JSONB, error_step TEXT, error_msg TEXT, retries INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_promos_erros_created ON promos_erros(created_at);
