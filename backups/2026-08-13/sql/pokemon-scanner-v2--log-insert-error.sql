-- Pokemon Scanner v2 > node "Log Insert Error"
-- Backup de 13/08/2026.

=INSERT INTO promos_erros (item_id, payload, error_step, error_msg) VALUES ('{{ $json.item_id }}', '{{ JSON.stringify({ item_id: $json.item_id, title: $json.title, price_cents: $json.price_cents, discount_pct: $json.discount_pct, permalink: $json.permalink }).replace(/'/g, "''") }}'::jsonb, 'busca', '{{ String($json.error || "insert promo failed").replace(/'/g, "''").slice(0, 500) }}');
