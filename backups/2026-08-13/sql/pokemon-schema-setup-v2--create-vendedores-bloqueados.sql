-- Pokemon Schema Setup v2 > node "Create vendedores_bloqueados"
-- Backup de 13/08/2026.

CREATE TABLE IF NOT EXISTS vendedores_bloqueados (id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL UNIQUE, motivo TEXT, ativo BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_vendedores_bloqueados_ativo ON vendedores_bloqueados(ativo); INSERT INTO vendedores_bloqueados (nome, motivo) VALUES ('Lehadry Jóias', 'vende carta Pokemon com marca POKEMON autodeclarada e selo Loja oficial do ML; e joalheria, nao loja oficial da Pokemon'), ('Vikn Comércio de Auto Peças', 'vende carta Pokemon com marca POKEMON autodeclarada e selo Loja oficial do ML; e loja de auto pecas') ON CONFLICT (nome) DO NOTHING;
