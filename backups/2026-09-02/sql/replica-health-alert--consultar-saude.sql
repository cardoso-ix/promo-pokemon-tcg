-- Replica Health Alert -> node "Consultar Saude da Replica"
-- Saude da esteira de WhatsApp. Nao consulta promos / lojas_confiaveis.
SELECT
  COALESCE((
    SELECT LOWER(BTRIM(valor))
      FROM replica_config
     WHERE chave = 'ativo'
     LIMIT 1
  ), 'false') AS replica_ativa,
  COALESCE((
    SELECT LOWER("connectionStatus"::text)
      FROM evolution."Instance"
     WHERE name = 'promo-replica'
     LIMIT 1
  ), 'ausente') AS wa_estado,
  EXISTS (
    SELECT 1
      FROM evolution."Instance"
     WHERE name = 'promo-replica'
       AND LOWER("connectionStatus"::text) = 'open'
  ) AS wa_conectado,
  (
    SELECT count(*)::int
      FROM replica_transmissoes
     WHERE ativo
  ) AS rotas_ativas,
  (
    SELECT count(*)::int
      FROM replica_transmissao_origens o
      JOIN replica_transmissoes t ON t.id = o.transmissao_id
     WHERE t.ativo
  ) AS origens_ativas,
  (
    SELECT count(*)::int
      FROM replica_transmissao_destinos d
      JOIN replica_transmissoes t ON t.id = d.transmissao_id
     WHERE t.ativo
       AND d.plataforma = 'telegram'
  ) AS destinos_tg_ativos,
  (
    SELECT count(*)::int
      FROM replica_log
     WHERE status = 'erro'
       AND criado_em > now() - interval '24 hours'
  ) AS erros_24h,
  COALESCE((
    SELECT json_agg(t)
      FROM (
        SELECT id,
               left(coalesce(motivo, ''), 160) AS motivo,
               to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando
          FROM replica_log
         WHERE status = 'erro'
           AND criado_em > now() - interval '24 hours'
         ORDER BY criado_em DESC
         LIMIT 8
      ) t
  ), '[]'::json) AS erros_amostra,
  (
    SELECT count(*)::int
      FROM replica_log
     WHERE status = 'pendente'
       AND criado_em < now() - interval '20 minutes'
  ) AS pendentes_presos,
  (
    SELECT count(*)::int
      FROM replica_log
     WHERE criado_em > now() - interval '3 hours'
  ) AS eventos_3h,
  (
    SELECT count(*)::int
      FROM replica_log
     WHERE status = 'enviado'
       AND coalesce(enviado_em, criado_em) > now() - interval '3 hours'
  ) AS enviados_3h,
  (
    SELECT to_char(max(enviado_em) AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI')
      FROM replica_log
     WHERE status = 'enviado'
  ) AS ultimo_envio_brt,
  (
    SELECT EXTRACT(EPOCH FROM (now() - max(enviado_em))) / 60
      FROM replica_log
     WHERE status = 'enviado'
  ) AS minutos_sem_enviar,
  EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS hora_brt,
  to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS agora_brt;
