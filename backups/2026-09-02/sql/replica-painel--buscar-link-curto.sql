CREATE TABLE IF NOT EXISTS replica_links (
  id TEXT PRIMARY KEY,
  destino TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT destino
  FROM replica_links
 WHERE id = $1
   AND destino ~* '^https://([a-z0-9-]+\.)*(mercadolivre\.com\.br|mercadolibre\.com)/'
 LIMIT 1;