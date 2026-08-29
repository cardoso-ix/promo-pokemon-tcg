-- Replica Nomes Sync -> node "Gravar Grupos Descobertos"
-- $1 = JSON array [{chat_id, nome}] em base64.
-- Vem do fetchAllGroups (job), nao do GET do painel.
INSERT INTO replica_rotas (chat_id, nome, plataforma, ativa)
SELECT v.chat_id,
       CASE
         WHEN NULLIF(BTRIM(v.nome), '') IS NULL
           OR BTRIM(v.nome) = v.chat_id
           OR BTRIM(v.nome) LIKE '%@g.us'
         THEN NULL
         ELSE LEFT(BTRIM(v.nome), 80)
       END,
       'whatsapp',
       FALSE
  FROM json_to_recordset(
         convert_from(decode($1, 'base64'), 'UTF8')::json
       ) AS v(chat_id text, nome text)
 WHERE v.chat_id LIKE '%@g.us'
ON CONFLICT (chat_id) DO UPDATE
   SET nome = COALESCE(
         NULLIF(EXCLUDED.nome, ''),
         NULLIF(replica_rotas.nome, replica_rotas.chat_id),
         replica_rotas.nome
       );

SELECT
  (SELECT COUNT(*) FROM replica_rotas WHERE plataforma = 'whatsapp') AS grupos_no_combo,
  (
    SELECT COUNT(*) FROM evolution."Chat" c
    JOIN evolution."Instance" i ON i.id = c."instanceId"
    WHERE i.name = 'promo-replica' AND c."remoteJid" LIKE '%@g.us'
  ) AS grupos_no_chat;
