-- Replica WhatsApp Ingest -> node "Consultar Rota e Config"
-- $1 = chat_id do grupo de origem (ex.: 5551999999999-1600000000@g.us)
--
-- Faz tres coisas numa ida ao banco:
--   1. cadastra o grupo sozinho na primeira mensagem (ativa = FALSE, quem libera e o Eduardo);
--   2. conta a mensagem vista e atualiza o horario;
--   3. devolve a configuracao vigente e quantos posts sairam na ultima hora.
WITH rota AS (
  INSERT INTO replica_rotas (chat_id, plataforma, mensagens_vistas, ultima_mensagem)
  VALUES ($1, 'whatsapp', 1, NOW())
  ON CONFLICT (chat_id) DO UPDATE
    SET mensagens_vistas = replica_rotas.mensagens_vistas + 1,
        ultima_mensagem = NOW()
  RETURNING chat_id, nome, ativa
)
SELECT
  rota.chat_id,
  rota.nome,
  rota.ativa,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'ativo'), 'false') AS sistema_ativo,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'destino_telegram'), '@promopokemontcg') AS destino,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'delay_segundos'), '8') AS delay_segundos,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'teto_hora'), '40') AS teto_hora,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'replicar_cupom_sem_link'), 'false') AS cupom_sem_link,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'afiliado_matt_word'), '') AS matt_word,
  COALESCE((SELECT valor FROM replica_config WHERE chave = 'afiliado_matt_tool'), '') AS matt_tool,
  COALESCE((
    SELECT json_agg(json_build_object(
             'plataforma', plataforma,
             'identificador', identificador,
             'nome', nome
           ) ORDER BY id)
      FROM replica_destinos
     WHERE ativo
  ), '[]'::json) AS destinos,
  EXISTS (
    SELECT 1 FROM replica_destinos d
     WHERE d.ativo
       AND d.plataforma = 'whatsapp'
       AND d.identificador = rota.chat_id
  ) AS origem_e_destino,
  (SELECT COUNT(*) FROM replica_log
     WHERE status = 'enviado' AND enviado_em > NOW() - INTERVAL '1 hour') AS enviados_hora
FROM rota;
