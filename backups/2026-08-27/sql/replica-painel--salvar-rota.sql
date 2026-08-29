-- Replica Painel -> node "Salvar Rota"
-- $1 chat_id, $2 ativa (true/false ou null para manter), $3 nome (null para manter)
UPDATE replica_rotas
   SET ativa = COALESCE($2::boolean, ativa),
       nome  = COALESCE($3::text, nome)
 WHERE chat_id = $1::text
RETURNING chat_id, nome, ativa;
