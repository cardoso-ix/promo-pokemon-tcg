-- Replica Painel -> node "Carregar Dados"
-- Lista os grupos a partir de replica_rotas (cache). O GET NAO chama a Evolution.
-- Chat.name/Contact.pushName costumam vir vazios (DATABASE_SAVE_DATA_CHATS=false e
-- nao existe coluna subject). O job Replica Nomes Sync grava o subject em replica_rotas.nome
-- via GET /group/findGroupInfos. Sem titulo, o combo mostra "Grupo " + 6 chars do JID.
-- Tambem garante as tabelas de rotas NOMEADAS e migra o lote legado (se houver origens ativas).
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

INSERT INTO replica_destinos (plataforma, identificador, nome)
VALUES ('telegram', '@promopokemontcg', 'Pokémon TCG Promo')
ON CONFLICT (plataforma, identificador) DO UPDATE
   SET nome = EXCLUDED.nome;

WITH brutos AS (
  SELECT c."remoteJid" AS chat_id,
         NULLIF(BTRIM(c."name"), '') AS nome,
         1 AS prio
    FROM evolution."Chat" c
    JOIN evolution."Instance" i ON i.id = c."instanceId"
   WHERE i.name = 'promo-replica'
     AND c."remoteJid" LIKE '%@g.us'
  UNION ALL
  SELECT ct."remoteJid",
         NULLIF(BTRIM(ct."pushName"), ''),
         2
    FROM evolution."Contact" ct
    JOIN evolution."Instance" i ON i.id = ct."instanceId"
   WHERE i.name = 'promo-replica'
     AND ct."remoteJid" LIKE '%@g.us'
), chats AS (
  SELECT DISTINCT ON (chat_id)
         chat_id,
         CASE
           WHEN nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@g.us'
           THEN NULL
           ELSE LEFT(nome, 80)
         END AS nome
    FROM brutos
   ORDER BY chat_id,
            CASE WHEN nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@g.us' THEN 1 ELSE 0 END,
            prio
), upsert AS (
  INSERT INTO replica_rotas (chat_id, nome, plataforma, ativa)
  SELECT chat_id, nome, 'whatsapp', FALSE
    FROM chats
  ON CONFLICT (chat_id) DO UPDATE
     SET nome = COALESCE(
           NULLIF(EXCLUDED.nome, ''),
           NULLIF(replica_rotas.nome, replica_rotas.chat_id),
           replica_rotas.nome
         )
  RETURNING chat_id
), legado AS (
  INSERT INTO replica_transmissoes (nome, ativo)
  SELECT 'WhatsApp para Telegram', TRUE
   WHERE NOT EXISTS (SELECT 1 FROM replica_transmissoes)
     AND EXISTS (SELECT 1 FROM replica_rotas WHERE ativa)
  RETURNING id
), legado_o AS (
  INSERT INTO replica_transmissao_origens (transmissao_id, chat_id)
  SELECT l.id, r.chat_id
    FROM legado l
    JOIN replica_rotas r ON r.ativa
  ON CONFLICT DO NOTHING
  RETURNING chat_id
), legado_d AS (
  INSERT INTO replica_transmissao_destinos (transmissao_id, plataforma, identificador, nome)
  SELECT l.id, d.plataforma, d.identificador, d.nome
    FROM legado l
    JOIN replica_destinos d ON d.ativo
  ON CONFLICT DO NOTHING
  RETURNING identificador
), sync_ativa AS (
  UPDATE replica_rotas r
     SET ativa = EXISTS (
       SELECT 1
         FROM replica_transmissao_origens o
         JOIN replica_transmissoes t ON t.id = o.transmissao_id
        WHERE o.chat_id = r.chat_id AND t.ativo
     )
   WHERE EXISTS (SELECT 1 FROM replica_transmissoes)
  RETURNING r.chat_id
), janela AS (
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje,
         ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date - 6) AS inicio
), serie AS (
  SELECT d::date AS dia,
         COUNT(l.id) AS processadas,
         COUNT(l.id) FILTER (WHERE l.status = 'enviado') AS enviados
    FROM janela j
    CROSS JOIN LATERAL generate_series(j.inicio, j.hoje, INTERVAL '1 day') AS d
    LEFT JOIN replica_log l
      ON (l.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = d::date
   GROUP BY d
), rotas_cards AS (
  SELECT t.id,
         t.nome,
         t.ativo,
         (SELECT COUNT(*) FROM replica_transmissao_origens o WHERE o.transmissao_id = t.id) AS n_origens,
         (SELECT COUNT(*) FROM replica_transmissao_destinos d WHERE d.transmissao_id = t.id) AS n_destinos
    FROM replica_transmissoes t
)
SELECT json_build_object(
  'pagina_gz', COALESCE((SELECT valor FROM replica_config WHERE chave = 'pagina_gz'), ''),
  'grupos_sincronizados', (SELECT COUNT(*) FROM upsert),
  'grupos_no_chat', (
    SELECT COUNT(*) FROM evolution."Chat" c
    JOIN evolution."Instance" i ON i.id = c."instanceId"
    WHERE i.name = 'promo-replica' AND c."remoteJid" LIKE '%@g.us'
  ),
  'grupos_no_contact', (
    SELECT COUNT(*) FROM evolution."Contact" ct
    JOIN evolution."Instance" i ON i.id = ct."instanceId"
    WHERE i.name = 'promo-replica' AND ct."remoteJid" LIKE '%@g.us'
  ),
  'grupos_no_combo', (
    SELECT COUNT(*) FROM replica_rotas WHERE plataforma = 'whatsapp'
  ),
  'whatsapp', json_build_object(
    'conectado', EXISTS (
      SELECT 1 FROM evolution."Instance"
       WHERE name = 'promo-replica'
         AND LOWER("connectionStatus"::text) = 'open'
    ),
    'estado', COALESCE((
      SELECT LOWER("connectionStatus"::text)
        FROM evolution."Instance"
       WHERE name = 'promo-replica'
       LIMIT 1
    ), 'close')
  ),
  'telegram', json_build_object(
    'conectado', EXISTS (
      SELECT 1 FROM replica_destinos
       WHERE plataforma = 'telegram' AND ativo
    ),
    'identificador', COALESCE((
      SELECT identificador FROM replica_destinos
       WHERE plataforma = 'telegram' AND ativo
       ORDER BY id LIMIT 1
    ), '@promopokemontcg'),
    'nome', COALESCE((
      SELECT COALESCE(nome, identificador) FROM replica_destinos
       WHERE plataforma = 'telegram' AND ativo
       ORDER BY id LIMIT 1
    ), 'Pokémon TCG Promo')
  ),
  'aviso_grupos', CASE
     WHEN NOT EXISTS (
       SELECT 1 FROM replica_rotas WHERE plataforma = 'whatsapp'
     )
     THEN 'Nenhum grupo visto ainda nesta conta. Entre nos grupos com o numero do QR e recarregue.'
     WHEN EXISTS (
       SELECT 1 FROM replica_rotas
        WHERE plataforma = 'whatsapp'
          AND (nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@g.us')
     )
     THEN 'Alguns grupos ainda estao sem titulo. O job Replica Nomes Sync busca o subject na Evolution; recarregue em alguns segundos. Enquanto isso o combo mostra um sufixo do JID e aceita busca.'
     ELSE ''
   END,
  'config', (
    SELECT COALESCE(json_object_agg(chave, valor), '{}'::json)
      FROM replica_config
     WHERE chave <> 'pagina_gz'
  ),
  'resumo', json_build_object(
    'enviados_hoje', (
      SELECT COUNT(*) FROM replica_log
       WHERE status = 'enviado'
         AND enviado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    ),
    'enviados_hora', (
      SELECT COUNT(*) FROM replica_log
       WHERE status = 'enviado' AND enviado_em > NOW() - INTERVAL '1 hour'
    ),
    'erros_hoje', (
      SELECT COUNT(*) FROM replica_log
       WHERE status = 'erro'
         AND criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    ),
    'rotas_total', (SELECT COUNT(*) FROM replica_transmissoes),
    'rotas_ativas', (SELECT COUNT(*) FROM replica_transmissoes WHERE ativo),
    'origens_ativas', (
      SELECT COUNT(DISTINCT o.chat_id)
        FROM replica_transmissao_origens o
        JOIN replica_transmissoes t ON t.id = o.transmissao_id
       WHERE t.ativo
    )
  ),
  'periodo', (
    SELECT json_build_object(
      'dias', 7,
      'inicio', to_char(j.inicio, 'DD/MM'),
      'fim', to_char(j.hoje, 'DD/MM'),
      'inicio_completo', to_char(j.inicio, 'DD/MM/YYYY'),
      'fim_completo', to_char(j.hoje, 'DD/MM/YYYY')
    )
    FROM janela j
  ),
  'resumo_7d', json_build_object(
    'processadas', (SELECT COALESCE(SUM(processadas), 0) FROM serie),
    'enviados', (SELECT COALESCE(SUM(enviados), 0) FROM serie),
    'rotas_ativas', (SELECT COUNT(*) FROM replica_transmissoes WHERE ativo),
    'media_diaria', (SELECT ROUND(COALESCE(SUM(enviados), 0)::numeric / 7, 1) FROM serie)
  ),
  'serie_dias', (
    SELECT COALESCE(json_agg(json_build_object(
      'dia', to_char(s.dia, 'DD/MM'),
      'processadas', s.processadas,
      'enviados', s.enviados
    ) ORDER BY s.dia), '[]'::json)
    FROM serie s
  ),
  'por_destino', json_build_object(
    'telegram', (
      SELECT COUNT(*)
        FROM replica_transmissao_destinos d
        JOIN replica_transmissoes t ON t.id = d.transmissao_id
       WHERE t.ativo AND d.plataforma = 'telegram'
    ),
    'whatsapp', (
      SELECT COUNT(*)
        FROM replica_transmissao_destinos d
        JOIN replica_transmissoes t ON t.id = d.transmissao_id
       WHERE t.ativo AND d.plataforma = 'whatsapp'
    )
  ),
  'rotas_cards', (
    SELECT COALESCE(json_agg(c ORDER BY c.id), '[]'::json)
    FROM rotas_cards c
  ),
  'grupos', (
    SELECT COALESCE(json_agg(g), '[]'::json) FROM (
      SELECT chat_id,
             CASE
               WHEN nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@g.us'
               THEN 'Grupo ' || RIGHT(REPLACE(chat_id, '@g.us', ''), 6)
               ELSE nome
             END AS nome
        FROM replica_rotas
       WHERE plataforma = 'whatsapp'
       ORDER BY
         CASE WHEN nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@g.us' THEN 1 ELSE 0 END,
         COALESCE(NULLIF(nome, chat_id), chat_id)
    ) g
  ),
  'rotas', (
    SELECT COALESCE(json_agg(x ORDER BY x.id), '[]'::json) FROM (
      SELECT t.id,
             t.nome,
             t.ativo,
             (
               SELECT COALESCE(json_agg(o), '[]'::json) FROM (
                 SELECT o.chat_id,
                        CASE
                          WHEN r.nome IS NULL OR r.nome = '' OR r.nome = r.chat_id OR r.nome LIKE '%@g.us'
                          THEN 'Grupo ' || RIGHT(REPLACE(o.chat_id, '@g.us', ''), 6)
                          ELSE r.nome
                        END AS nome
                   FROM replica_transmissao_origens o
                   LEFT JOIN replica_rotas r ON r.chat_id = o.chat_id
                  WHERE o.transmissao_id = t.id
                  ORDER BY 2
               ) o
             ) AS origens,
             (
               SELECT COALESCE(json_agg(d), '[]'::json) FROM (
                 SELECT d.plataforma,
                        d.identificador,
                        COALESCE(d.nome, d.identificador) AS nome
                   FROM replica_transmissao_destinos d
                  WHERE d.transmissao_id = t.id
                  ORDER BY d.plataforma, d.identificador
               ) d
             ) AS destinos
        FROM replica_transmissoes t
    ) x
  ),
  'telegram_opcoes', (
    SELECT COALESCE(json_agg(t), '[]'::json) FROM (
      SELECT identificador, COALESCE(nome, identificador) AS nome
        FROM replica_destinos
       WHERE plataforma = 'telegram'
      UNION
      SELECT '@promopokemontcg', 'Pokémon TCG Promo'
    ) t
  ),
  'logs', (
    SELECT COALESCE(json_agg(l), '[]'::json) FROM (
      SELECT to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
             origem_chat_id,
             origem_nome,
             status,
             motivo,
             links_convertidos,
             LEFT(COALESCE(texto_publicado, texto_original, ''), 160) AS trecho
        FROM replica_log
       ORDER BY id DESC
       LIMIT 40
    ) l
  ),
  'legado_migrado', (SELECT COUNT(*) FROM legado),
  'sync_ativa', (SELECT COUNT(*) FROM sync_ativa)
) AS painel;
