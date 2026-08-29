-- Replica Nomes Sync -> node "Listar Grupos Sem Nome"
-- Nao bloqueia o GET do painel. Sincroniza JIDs de evolution.Chat e devolve
-- so os grupos ainda sem titulo humano para o findGroupInfos por JID.
INSERT INTO replica_rotas (chat_id, nome, plataforma, ativa)
SELECT remote_jid,
       CASE
         WHEN NULLIF(BTRIM(nome), '') IS NULL
           OR BTRIM(nome) = remote_jid
           OR BTRIM(nome) LIKE '%@g.us'
         THEN NULL
         ELSE LEFT(BTRIM(nome), 80)
       END,
       'whatsapp',
       FALSE
  FROM (
    SELECT c."remoteJid" AS remote_jid, c."name" AS nome
      FROM evolution."Chat" c
      JOIN evolution."Instance" i ON i.id = c."instanceId"
     WHERE i.name = 'promo-replica'
       AND c."remoteJid" LIKE '%@g.us'
    UNION ALL
    SELECT ct."remoteJid", ct."pushName"
      FROM evolution."Contact" ct
      JOIN evolution."Instance" i ON i.id = ct."instanceId"
     WHERE i.name = 'promo-replica'
       AND ct."remoteJid" LIKE '%@g.us'
  ) x
ON CONFLICT (chat_id) DO UPDATE
   SET nome = COALESCE(
         NULLIF(EXCLUDED.nome, ''),
         NULLIF(replica_rotas.nome, replica_rotas.chat_id),
         replica_rotas.nome
       );

SELECT r.chat_id
  FROM replica_rotas r
 WHERE r.plataforma = 'whatsapp'
   AND (
     r.nome IS NULL
     OR BTRIM(r.nome) = ''
     OR r.nome = r.chat_id
     OR r.nome LIKE '%@g.us'
   )
 ORDER BY r.chat_id;
