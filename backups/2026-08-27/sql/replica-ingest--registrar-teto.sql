-- Replica WhatsApp Ingest -> node "Registrar Teto Atingido"
-- $1 = chat_id, $2 = id da mensagem no WhatsApp, $3 = hash sintetico, $4 = texto original
--
-- Existe para o teto nao virar buraco negro: se a replica engolir uma promo por
-- protecao anti-flood, isso fica visivel no painel.
INSERT INTO replica_log (
  origem_chat_id, origem_message_id, hash_conteudo, texto_original, status, motivo
)
VALUES ($1, $2, $3, $4, 'ignorado', 'teto_por_hora_atingido')
ON CONFLICT (hash_conteudo) DO NOTHING
RETURNING id, status;
