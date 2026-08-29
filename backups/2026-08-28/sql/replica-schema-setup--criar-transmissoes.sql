-- Replica Schema Setup / Painel / Ingest
-- Rotas NOMEADAS de transmissao (varias origens + destinos, com toggle ATIVA).
-- replica_rotas continua sendo o catalogo de grupos WhatsApp da conta.
-- replica_destinos continua sendo o catalogo de destinos (Telegram / WA).
CREATE TABLE IF NOT EXISTS replica_destinos (
  id BIGSERIAL PRIMARY KEY,
  plataforma TEXT NOT NULL,
  identificador TEXT NOT NULL,
  nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plataforma, identificador)
);

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

CREATE INDEX IF NOT EXISTS idx_replica_transmissoes_ativo
  ON replica_transmissoes (ativo);
CREATE INDEX IF NOT EXISTS idx_replica_transmissao_origens_chat
  ON replica_transmissao_origens (chat_id);
