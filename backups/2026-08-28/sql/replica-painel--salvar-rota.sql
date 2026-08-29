-- Replica Painel -> node "Gravar Rota"
-- $1 id da transmissao, $2 ativo (true/false ou vazio para manter), $3 excluir (true/false)
CREATE TABLE IF NOT EXISTS replica_transmissoes (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS replica_transmissao_origens (
  transmissao_id BIGINT NOT NULL REFERENCES replica_transmissoes(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  PRIMARY KEY (transmissao_id, chat_id)
);

CREATE TABLE IF NOT EXISTS replica_transmissao_destinos (
  transmissao_id BIGINT NOT NULL REFERENCES replica_transmissoes(id) ON DELETE CASCADE,
  plataforma TEXT NOT NULL,
  identificador TEXT NOT NULL,
  nome TEXT,
  PRIMARY KEY (transmissao_id, plataforma, identificador)
);

WITH params AS (
  SELECT $1::bigint AS id,
         NULLIF(TRIM($2::text), '')::boolean AS ativo,
         COALESCE(NULLIF(TRIM($3::text), '')::boolean, FALSE) AS excluir
), apagar AS (
  DELETE FROM replica_transmissoes t
   USING params p
   WHERE p.excluir AND t.id = p.id
  RETURNING t.id
), ligar AS (
  UPDATE replica_transmissoes t
     SET ativo = COALESCE(p.ativo, t.ativo)
    FROM params p
   WHERE NOT p.excluir AND t.id = p.id
  RETURNING t.id, t.nome, t.ativo
), sync_ativa AS (
  UPDATE replica_rotas r
     SET ativa = EXISTS (
       SELECT 1
         FROM replica_transmissao_origens o
         JOIN replica_transmissoes t ON t.id = o.transmissao_id
        WHERE o.chat_id = r.chat_id AND t.ativo
     )
   WHERE (SELECT COUNT(*) FROM apagar) + (SELECT COUNT(*) FROM ligar) >= 0
  RETURNING r.chat_id
)
SELECT json_build_object(
  'ok', true,
  'apagada', (SELECT COUNT(*) FROM apagar),
  'atualizada', (SELECT COUNT(*) FROM ligar),
  'sync', (SELECT COUNT(*) FROM sync_ativa)
) AS resultado;
