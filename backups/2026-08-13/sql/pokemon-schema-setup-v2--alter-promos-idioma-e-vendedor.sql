-- Pokemon Schema Setup v2 > node "Alter promos idioma e vendedor"
-- Backup de 13/08/2026.

ALTER TABLE promos ADD COLUMN IF NOT EXISTS idioma TEXT; ALTER TABLE promos ADD COLUMN IF NOT EXISTS idioma_confianca NUMERIC(3,2); ALTER TABLE promos ADD COLUMN IF NOT EXISTS vendedor TEXT; CREATE INDEX IF NOT EXISTS idx_promos_vendedor ON promos(vendedor);
