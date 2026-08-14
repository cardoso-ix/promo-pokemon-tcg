-- Pokemon Schema Setup v2 > node "Create promos_log"
-- Backup de 13/08/2026.

CREATE TABLE IF NOT EXISTS promos_log (id BIGSERIAL PRIMARY KEY, item_id TEXT, decision TEXT, reason TEXT, created_at TIMESTAMPTZ DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_promos_log_item ON promos_log(item_id); CREATE INDEX IF NOT EXISTS idx_promos_log_created ON promos_log(created_at);
