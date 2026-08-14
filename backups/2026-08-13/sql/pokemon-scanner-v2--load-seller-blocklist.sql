-- Pokemon Scanner v2 > node "Load Seller Blocklist"
-- Backup de 13/08/2026.

CREATE TABLE IF NOT EXISTS vendedores_bloqueados (id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL UNIQUE, motivo TEXT, ativo BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now()); SELECT COALESCE(json_agg(nome), '[]'::json) AS bloqueados FROM vendedores_bloqueados WHERE ativo = TRUE;
