-- Replica Painel -> node "Gravar Lote"
-- $1 acao: salvar | telegram | telegram_off
-- $2 id da rota (vazio = nova)
-- $3 nome
-- $4 ativo (true/false)
-- $5 JSON array de chat_id de origem
-- $6 JSON array de destinos [{plataforma, identificador, nome}]
-- $7 identificador do Telegram (so na acao telegram)
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

WITH params AS (
  SELECT TRIM($1::text) AS acao,
         NULLIF(TRIM($2::text), '')::bigint AS id,
         LEFT(COALESCE(NULLIF(TRIM($3::text), ''), 'Nova rota'), 80) AS nome,
         COALESCE(NULLIF(TRIM($4::text), ''), 'true') = 'true' AS ativo,
         COALESCE(NULLIF(TRIM($5::text), ''), '[]')::jsonb AS origens,
         COALESCE(NULLIF(TRIM($6::text), ''), '[]')::jsonb AS destinos,
         NULLIF(TRIM($7::text), '') AS telegram_id
), tg_off AS (
  UPDATE replica_destinos d
     SET ativo = FALSE
    FROM params p
   WHERE p.acao = 'telegram_off'
     AND d.plataforma = 'telegram'
  RETURNING d.id
), tg_off_rotas AS (
  DELETE FROM replica_transmissao_destinos d
   USING params p
   WHERE p.acao = 'telegram_off'
     AND d.plataforma = 'telegram'
  RETURNING d.transmissao_id
), tg_off_old AS (
  UPDATE replica_destinos d
     SET ativo = FALSE
    FROM params p
   WHERE p.acao = 'telegram'
     AND d.plataforma = 'telegram'
     AND d.identificador IS DISTINCT FROM p.telegram_id
  RETURNING d.id
), tg_on AS (
  INSERT INTO replica_destinos (plataforma, identificador, nome, ativo)
  SELECT 'telegram', p.telegram_id, p.telegram_id, TRUE
    FROM params p
   WHERE p.acao = 'telegram'
     AND p.telegram_id IS NOT NULL
  ON CONFLICT (plataforma, identificador) DO UPDATE
     SET ativo = TRUE,
         nome = COALESCE(EXCLUDED.nome, replica_destinos.nome)
  RETURNING id, identificador
), tg_cfg AS (
  INSERT INTO replica_config (chave, valor, atualizado_em)
  SELECT 'destino_telegram', p.telegram_id, NOW()
    FROM params p
   WHERE p.acao = 'telegram'
     AND p.telegram_id IS NOT NULL
  ON CONFLICT (chave) DO UPDATE
     SET valor = EXCLUDED.valor,
         atualizado_em = NOW()
  RETURNING chave
), tg_rotas AS (
  UPDATE replica_transmissao_destinos d
     SET identificador = p.telegram_id,
         nome = p.telegram_id
    FROM params p
   WHERE p.acao = 'telegram'
     AND p.telegram_id IS NOT NULL
     AND d.plataforma = 'telegram'
  RETURNING d.transmissao_id
), nova AS (
  INSERT INTO replica_transmissoes (nome, ativo)
  SELECT p.nome, p.ativo
    FROM params p
   WHERE p.acao = 'salvar'
     AND p.id IS NULL
  RETURNING id, nome, ativo
), edita AS (
  UPDATE replica_transmissoes t
     SET nome = p.nome,
         ativo = p.ativo
    FROM params p
   WHERE p.acao = 'salvar'
     AND p.id IS NOT NULL
     AND t.id = p.id
  RETURNING t.id, t.nome, t.ativo
), alvo AS (
  SELECT * FROM nova
  UNION ALL
  SELECT * FROM edita
), limpa_o AS (
  DELETE FROM replica_transmissao_origens o
   USING alvo a
   WHERE o.transmissao_id = a.id
  RETURNING o.chat_id
), insere_o AS (
  INSERT INTO replica_transmissao_origens (transmissao_id, chat_id)
  SELECT a.id, TRIM(x)
    FROM alvo a
    CROSS JOIN params p
    CROSS JOIN LATERAL jsonb_array_elements_text(p.origens) AS x
   WHERE TRIM(x) != ''
     AND (SELECT COUNT(*) FROM limpa_o) >= 0
  ON CONFLICT DO NOTHING
  RETURNING chat_id
), limpa_d AS (
  DELETE FROM replica_transmissao_destinos d
   USING alvo a
   WHERE d.transmissao_id = a.id
  RETURNING d.identificador
), insere_d AS (
  INSERT INTO replica_transmissao_destinos (transmissao_id, plataforma, identificador, nome)
  SELECT a.id,
         COALESCE(NULLIF(x.plataforma, ''), 'telegram'),
         x.identificador,
         NULLIF(x.nome, '')
    FROM alvo a
    CROSS JOIN params p,
         jsonb_to_recordset(p.destinos) AS x(plataforma text, identificador text, nome text)
   WHERE x.identificador IS NOT NULL
     AND TRIM(x.identificador) != ''
     AND (SELECT COUNT(*) FROM limpa_d) >= 0
  ON CONFLICT DO NOTHING
  RETURNING identificador
), catalogo AS (
  INSERT INTO replica_destinos (plataforma, identificador, nome, ativo)
  SELECT COALESCE(NULLIF(x.plataforma, ''), 'telegram'),
         x.identificador,
         NULLIF(x.nome, ''),
         TRUE
    FROM params p,
         jsonb_to_recordset(p.destinos) AS x(plataforma text, identificador text, nome text)
   WHERE p.acao = 'salvar'
     AND x.identificador IS NOT NULL
     AND TRIM(x.identificador) != ''
  ON CONFLICT (plataforma, identificador) DO UPDATE
     SET nome = COALESCE(EXCLUDED.nome, replica_destinos.nome),
         ativo = TRUE
  RETURNING id
), telegram_cfg_salvar AS (
  INSERT INTO replica_config (chave, valor, atualizado_em)
  SELECT 'destino_telegram',
         COALESCE(
           (SELECT identificador FROM replica_destinos WHERE plataforma = 'telegram' AND ativo ORDER BY id LIMIT 1),
           '@promopokemontcg'
         ),
         NOW()
    FROM params p
   WHERE p.acao = 'salvar'
  ON CONFLICT (chave) DO UPDATE
     SET valor = EXCLUDED.valor,
         atualizado_em = NOW()
  RETURNING chave
), sync_ativa AS (
  UPDATE replica_rotas r
     SET ativa = EXISTS (
       SELECT 1
         FROM replica_transmissao_origens o
         JOIN replica_transmissoes t ON t.id = o.transmissao_id
        WHERE o.chat_id = r.chat_id AND t.ativo
     )
  RETURNING r.chat_id
)
SELECT json_build_object(
  'ok', true,
  'acao', (SELECT acao FROM params),
  'rota_id', (SELECT id FROM alvo),
  'origens', (SELECT COUNT(*) FROM insere_o),
  'destinos', (SELECT COUNT(*) FROM insere_d),
  'catalogo', (SELECT COUNT(*) FROM catalogo),
  'telegram', (SELECT identificador FROM tg_on),
  'tg_off', (SELECT COUNT(*) FROM tg_off),
  'tg_rotas', (SELECT COUNT(*) FROM tg_rotas),
  'tg_off_rotas', (SELECT COUNT(*) FROM tg_off_rotas),
  'tg_off_old', (SELECT COUNT(*) FROM tg_off_old),
  'tg_cfg', (SELECT chave FROM tg_cfg),
  'cfg_salvar', (SELECT chave FROM telegram_cfg_salvar),
  'sync', (SELECT COUNT(*) FROM sync_ativa)
) AS resultado;
