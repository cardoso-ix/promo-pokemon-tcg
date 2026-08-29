-- Replica WhatsApp Ingest -> node "Registrar e Deduplicar"
-- $1 chat_id, $2 nome da rota, $3 id da mensagem no WhatsApp, $4 hash do conteudo,
-- $5 texto original, $6 texto publicado, $7 links convertidos, $8 item ids,
-- $9 tem midia, $10 status inicial (pendente ou descartado), $11 motivo
--
-- O UNIQUE em hash_conteudo e o dedup: se a mesma promo chegar por dois grupos, o
-- segundo INSERT nao grava, a consulta devolve zero linha e o fluxo para sozinho.
INSERT INTO replica_log (
  origem_chat_id, origem_nome, origem_message_id, hash_conteudo,
  texto_original, texto_publicado, links_convertidos, item_ids,
  tem_midia, status, motivo
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (hash_conteudo) DO NOTHING
RETURNING id, status, motivo;
