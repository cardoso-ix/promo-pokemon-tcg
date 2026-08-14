-- Pokemon Store Scanner > node "Inserir Promo da Loja"
-- Backup de 13/08/2026.

=INSERT INTO promos (item_id, title, price_cents, original_price_cents, discount_pct, seller_reputation, seller_sales, category_id, thumbnail, permalink, utm_link, status, search_term, idioma, idioma_confianca) VALUES ('{{ $json.item_id }}', '{{ $json.title }}', {{ $json.price_cents }}, {{ $json.original_price_cents }}, {{ $json.discount_pct }}, {{ $json.seller_reputation_sql }}, {{ $json.seller_sales_sql }}, {{ $json.category_id_sql }}, '{{ $json.thumbnail }}', '{{ $json.permalink }}', '{{ $json.utm_link }}', 'pending', '{{ $json.search_term }}', {{ $json.idioma_sql }}, {{ $json.idioma_confianca_sql }}) ON CONFLICT (item_id) DO NOTHING RETURNING item_id;
