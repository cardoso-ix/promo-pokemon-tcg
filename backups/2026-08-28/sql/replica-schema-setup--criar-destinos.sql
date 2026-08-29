-- Replica Schema Setup -> node "Criar Destinos"
-- Destinos da replica: canal/grupo do Telegram e grupos do WhatsApp do Eduardo.
-- Origem continua em replica_rotas (ativa = TRUE). Destino nao pode ser origem
-- (o ingest ignora mensagem cujo chat_id esta nesta tabela).
CREATE TABLE IF NOT EXISTS replica_destinos (
  id BIGSERIAL PRIMARY KEY,
  plataforma TEXT NOT NULL,
  identificador TEXT NOT NULL,
  nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plataforma, identificador)
);

INSERT INTO replica_destinos (plataforma, identificador, nome)
VALUES ('telegram', '@promopokemontcg', 'Pokemon TCG Promo')
ON CONFLICT (plataforma, identificador) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_replica_destinos_ativo ON replica_destinos (ativo);
