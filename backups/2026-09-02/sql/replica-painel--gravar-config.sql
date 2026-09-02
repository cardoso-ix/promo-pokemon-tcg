INSERT INTO replica_config (chave, valor, atualizado_em)
VALUES ($1::text, $2::text, NOW())
ON CONFLICT (chave) DO UPDATE
   SET valor = EXCLUDED.valor,
       atualizado_em = NOW()
RETURNING chave, valor;