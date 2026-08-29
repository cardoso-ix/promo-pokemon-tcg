-- Replica Painel -> node "Salvar Config"
-- $1 chave (validada por whitelist no node "Normalizar Pedido"), $2 valor
INSERT INTO replica_config (chave, valor, atualizado_em)
VALUES ($1::text, $2::text, NOW())
ON CONFLICT (chave) DO UPDATE
   SET valor = EXCLUDED.valor,
       atualizado_em = NOW()
RETURNING chave, valor;
