-- Pokemon Schema Setup v2 > node "Create cupons"
-- Backup de 13/08/2026.

CREATE TABLE IF NOT EXISTS cupons (id BIGSERIAL PRIMARY KEY, codigo TEXT, descricao TEXT NOT NULL, valor_minimo_cents INTEGER, categoria_id TEXT, valido_de TIMESTAMPTZ DEFAULT now(), valido_ate TIMESTAMPTZ, ativo BOOLEAN NOT NULL DEFAULT TRUE, prioridade INTEGER NOT NULL DEFAULT 0, observacao TEXT, created_at TIMESTAMPTZ DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_cupons_ativos ON cupons(ativo, prioridade DESC, valido_ate);
