-- Replica Painel -> node "Gravar Grupos Atualizados"
INSERT INTO replica_rotas (chat_id, nome, plataforma, ativa)
SELECT v.chat_id,
       CASE
         WHEN NULLIF(BTRIM(v.nome), '') IS NULL
           OR BTRIM(v.nome) = v.chat_id
           OR BTRIM(v.nome) LIKE '%@%'
         THEN NULL
         ELSE LEFT(BTRIM(v.nome), 80)
       END,
       'whatsapp',
       FALSE
  FROM json_to_recordset(
         convert_from(decode($1, 'base64'), 'UTF8')::json
       ) AS v(chat_id text, nome text)
 WHERE v.chat_id LIKE '%@g.us'
    OR v.chat_id LIKE '%@newsletter'
ON CONFLICT (chat_id) DO UPDATE
   SET nome = COALESCE(
         NULLIF(EXCLUDED.nome, ''),
         NULLIF(replica_rotas.nome, replica_rotas.chat_id),
         replica_rotas.nome
       );

SELECT json_build_object(
  'ok', true,
  'grupos_no_combo', (
    SELECT COUNT(*) FROM replica_rotas WHERE plataforma = 'whatsapp'
  ),
  'grupos', (
    SELECT COALESCE(json_agg(g), '[]'::json) FROM (
      SELECT chat_id,
             CASE
               WHEN nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@%'
               THEN CASE
                 WHEN chat_id LIKE '%@newsletter'
                 THEN 'Canal ' || RIGHT(split_part(chat_id, '@', 1), 6)
                 ELSE 'Grupo ' || RIGHT(split_part(chat_id, '@', 1), 6)
               END
               ELSE nome
             END AS nome
        FROM replica_rotas
       WHERE plataforma = 'whatsapp'
       ORDER BY
         CASE WHEN nome IS NULL OR nome = '' OR nome = chat_id OR nome LIKE '%@%' THEN 1 ELSE 0 END,
         COALESCE(NULLIF(nome, chat_id), chat_id)
    ) g
  )
) AS resultado;