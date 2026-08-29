-- Replica WhatsApp Ingest -> node "Consultar Rota e Config"
-- $1 = chat_id do grupo de origem
-- queryBatching = single (CREATE + SELECT no mesmo script)
-- Origem liberada = aparece em alguma replica_transmissoes com ativo=true.
-- Sem rotas nomeadas ainda, cai no legado replica_rotas.ativa + replica_destinos.
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

WITH rota AS (
  INSERT INTO replica_rotas (chat_id, plataforma, mensagens_vistas, ultima_mensagem)
  VALUES ($1, 'whatsapp', 1, NOW())
  ON CONFLICT (chat_id) DO UPDATE
    SET mensagens_vistas = replica_rotas.mensagens_vistas + 1,
        ultima_mensagem = NOW()
  RETURNING chat_id, nome, ativa
)
SELECT
  rota.chat_id,
  rota.nome,
  CASE
    WHEN EXISTS (SELECT 1 FROM replica_transmissoes)
    THEN EXISTS (
      SELECT 1
        FROM replica_transmissao_origens o
        JOIN replica_transmissoes t ON t.id = o.transmissao_id
       WHERE o.chat_id = rota.chat_id AND t.ativo
    )
    ELSE rota.ativa
  END AS ativa,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'ativo'), 'false') AS sistema_ativo,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'destino_telegram'), '@promopokemontcg') AS destino,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'delay_segundos'), '8') AS delay_segundos,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'teto_hora'), '40') AS teto_hora,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'replicar_cupom_sem_link'), 'false') AS cupom_sem_link,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'afiliado_matt_word'), '') AS matt_word,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'afiliado_matt_tool'), '') AS matt_tool,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'frases_remover'), '') AS frases_remover,
  CASE
    WHEN EXISTS (SELECT 1 FROM replica_transmissoes)
    THEN COALESCE((
      SELECT json_agg(d)
        FROM (
          SELECT DISTINCT d.plataforma, d.identificador, d.nome
            FROM replica_transmissao_destinos d
            JOIN replica_transmissao_origens o ON o.transmissao_id = d.transmissao_id
            JOIN replica_transmissoes t ON t.id = d.transmissao_id
           WHERE t.ativo AND o.chat_id = rota.chat_id
        ) d
    ), '[]'::json)
    ELSE COALESCE((
      SELECT json_agg(json_build_object('plataforma', plataforma, 'identificador', identificador, 'nome', nome) ORDER BY id)
        FROM replica_destinos WHERE ativo
    ), '[]'::json)
  END AS destinos,
  CASE
    WHEN EXISTS (SELECT 1 FROM replica_transmissoes)
    THEN EXISTS (
      SELECT 1
        FROM replica_transmissao_destinos d
        JOIN replica_transmissao_origens o ON o.transmissao_id = d.transmissao_id
        JOIN replica_transmissoes t ON t.id = d.transmissao_id
       WHERE t.ativo
         AND o.chat_id = rota.chat_id
         AND d.plataforma = 'whatsapp'
         AND d.identificador = rota.chat_id
    )
    ELSE EXISTS (
      SELECT 1 FROM replica_destinos d
       WHERE d.ativo AND d.plataforma = 'whatsapp' AND d.identificador = rota.chat_id
    )
  END AS origem_e_destino,
  (SELECT COUNT(*) FROM replica_log WHERE status = 'enviado' AND enviado_em > NOW() - INTERVAL '1 hour') AS enviados_hora
FROM rota;
