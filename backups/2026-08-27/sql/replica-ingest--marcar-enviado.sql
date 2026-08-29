-- Replica WhatsApp Ingest -> node "Marcar Como Enviado"
-- $1 = message_id devolvido pelo Telegram, $2 = id da linha em replica_log
WITH marcado AS (
  UPDATE replica_log
     SET status = 'enviado',
         enviado_em = NOW(),
         telegram_message_id = $1
   WHERE id = $2
  RETURNING origem_chat_id
)
UPDATE replica_rotas
   SET replicadas = replicadas + 1
 WHERE chat_id = (SELECT origem_chat_id FROM marcado)
RETURNING chat_id, replicadas;
