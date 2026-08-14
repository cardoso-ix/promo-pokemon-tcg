=WITH antigo AS (
  SELECT item_id, price_cents
  FROM promos
  WHERE item_id = '{{ $json.item_id }}'
), gravado AS (
  INSERT INTO promos (item_id, title, price_cents, original_price_cents, discount_pct, seller_reputation, seller_sales, category_id, thumbnail, permalink, utm_link, status, search_term, loja_slug, idioma, idioma_confianca) VALUES ('{{ $json.item_id }}', '{{ $json.title }}', {{ $json.price_cents }}, {{ $json.original_price_cents }}, {{ $json.discount_pct }}, {{ $json.seller_reputation_sql }}, {{ $json.seller_sales_sql }}, {{ $json.category_id_sql }}, '{{ $json.thumbnail }}', '{{ $json.permalink }}', '{{ $json.utm_link }}', 'pending', '{{ $json.search_term }}', NULLIF('{{ $json.loja_slug }}',''), {{ $json.idioma_sql }}, {{ $json.idioma_confianca_sql }})
  ON CONFLICT (item_id) DO UPDATE SET title = EXCLUDED.title, price_cents = EXCLUDED.price_cents, original_price_cents = EXCLUDED.original_price_cents, discount_pct = EXCLUDED.discount_pct, thumbnail = EXCLUDED.thumbnail, permalink = EXCLUDED.permalink, utm_link = EXCLUDED.utm_link, idioma = EXCLUDED.idioma, idioma_confianca = EXCLUDED.idioma_confianca, category_id = EXCLUDED.category_id, loja_slug = EXCLUDED.loja_slug, status = 'pending', posted_at = NULL, telegram_message_id = NULL, blocked_reason = NULL
  WHERE promos.status = 'posted' AND EXCLUDED.price_cents < promos.price_cents AND ((promos.price_cents - EXCLUDED.price_cents) * 100 >= promos.price_cents * 5 OR (promos.price_cents - EXCLUDED.price_cents) >= 500) AND COALESCE(EXCLUDED.utm_link, '') LIKE '%matt_word=caed1312314%' AND COALESCE(EXCLUDED.utm_link, '') LIKE '%matt_tool=96097202%' AND COALESCE(EXCLUDED.thumbnail, '') LIKE 'http%' AND NOT EXISTS (SELECT 1 FROM promos_log pl WHERE pl.item_id = promos.item_id AND pl.decision = 'repost' AND pl.created_at > NOW() - INTERVAL '1 day')
  RETURNING item_id, price_cents, (xmax = 0) AS inserido
)
SELECT g.item_id,
  CASE WHEN g.inserido THEN 'aceito' ELSE 'repost' END AS decision,
  CASE WHEN g.inserido THEN NULL ELSE 'repost | R$ ' || replace(to_char(a.price_cents / 100.0, 'FM999990.00'), '.', ',') || ' -> R$ ' || replace(to_char(g.price_cents / 100.0, 'FM999990.00'), '.', ',') || ' | queda na vitrine (polycard)' END AS reason_repost
FROM gravado g
LEFT JOIN antigo a ON TRUE;