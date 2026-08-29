-- Replica Nomes Sync -> node "Gravar Nomes"
-- $1 = JSON array [{chat_id, nome}] em base64 (evita virgula no queryReplacement)
UPDATE replica_rotas r
   SET nome = LEFT(BTRIM(v.nome), 80)
  FROM json_to_recordset(
         convert_from(decode($1, 'base64'), 'UTF8')::json
       ) AS v(chat_id text, nome text)
 WHERE r.chat_id = v.chat_id
   AND v.nome IS NOT NULL
   AND BTRIM(v.nome) <> ''
   AND BTRIM(v.nome) NOT LIKE '%@g.us'
   AND BTRIM(v.nome) <> v.chat_id;

SELECT COUNT(*) AS nomes_gravados
  FROM replica_rotas
 WHERE plataforma = 'whatsapp'
   AND nome IS NOT NULL
   AND BTRIM(nome) <> ''
   AND nome NOT LIKE '%@g.us'
   AND nome <> chat_id;
