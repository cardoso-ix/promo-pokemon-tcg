-- Replica WhatsApp Ingest -> node "Registrar Erro de Envio"
-- $1 = motivo do erro, $2 = id da linha em replica_log
UPDATE replica_log
   SET status = 'erro',
       motivo = $1
 WHERE id = $2
RETURNING id, status, motivo;
