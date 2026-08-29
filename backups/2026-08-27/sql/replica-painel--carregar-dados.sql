-- Replica Painel -> node "Carregar Dados"
-- Devolve uma unica linha com a coluna painel (json) contendo config, resumo, rotas e logs.
SELECT json_build_object(
  'config', (
    SELECT COALESCE(json_object_agg(chave, valor), '{}'::json) FROM replica_config
  ),
  'resumo', json_build_object(
    'enviados_hoje', (
      SELECT COUNT(*) FROM replica_log
       WHERE status = 'enviado'
         AND enviado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    ),
    'enviados_hora', (
      SELECT COUNT(*) FROM replica_log
       WHERE status = 'enviado' AND enviado_em > NOW() - INTERVAL '1 hour'
    ),
    'erros_hoje', (
      SELECT COUNT(*) FROM replica_log
       WHERE status = 'erro'
         AND criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    ),
    'rotas_total', (SELECT COUNT(*) FROM replica_rotas),
    'rotas_ativas', (SELECT COUNT(*) FROM replica_rotas WHERE ativa)
  ),
  'rotas', (
    SELECT COALESCE(json_agg(r), '[]'::json) FROM (
      SELECT chat_id,
             nome,
             ativa,
             mensagens_vistas,
             replicadas,
             to_char(ultima_mensagem AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS ultima
        FROM replica_rotas
       ORDER BY ativa DESC, ultima_mensagem DESC NULLS LAST
       LIMIT 100
    ) r
  ),
  'logs', (
    SELECT COALESCE(json_agg(l), '[]'::json) FROM (
      SELECT to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
             origem_chat_id,
             origem_nome,
             status,
             motivo,
             links_convertidos,
             LEFT(COALESCE(texto_publicado, texto_original, ''), 160) AS trecho
        FROM replica_log
       ORDER BY id DESC
       LIMIT 40
    ) l
  )
) AS painel;
