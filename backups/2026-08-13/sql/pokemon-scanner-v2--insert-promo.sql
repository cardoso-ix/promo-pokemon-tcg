-- Pokemon Scanner v2 > node "Insert Promo"
-- Backup de 13/08/2026.

=INSERT INTO promos (item_id, title, price_cents, original_price_cents, discount_pct, seller_reputation, seller_sales, category_id, thumbnail, permalink, utm_link, status, search_term, idioma, idioma_confianca, vendedor) VALUES ('{{ $json.item_id }}', '{{ $json.title }}', {{ $json.price_cents }}, {{ $json.original_price_cents }}, {{ $json.discount_pct }}, {{ $json.seller_reputation }}, {{ $json.seller_sales }}, '{{ $json.category_id }}', '{{ $json.thumbnail }}', '{{ $json.permalink }}', '{{ $json.utm_link }}', 'pending', '{{ $json.search_term }}', '{{ $json.idioma }}', {{ $json.idioma_confianca }}, NULLIF('{{ $json.vendedor }}', '')) ON CONFLICT (item_id) DO NOTHING RETURNING item_id;
