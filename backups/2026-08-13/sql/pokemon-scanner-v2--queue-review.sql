-- Pokemon Scanner v2 > node "Queue Review"
-- Backup de 13/08/2026.

=INSERT INTO promos_review (item_id, title, price_cents, discount_pct, motivo) SELECT '{{ $("Normalize and Classify").item.json.item_id }}', '{{ $("Normalize and Classify").item.json.title }}', {{ $("Normalize and Classify").item.json.price_cents }}, {{ $("Normalize and Classify").item.json.discount_pct }}, '{{ $("Normalize and Classify").item.json.blocked_reason }}' WHERE NOT EXISTS (SELECT 1 FROM promos_review WHERE item_id = '{{ $("Normalize and Classify").item.json.item_id }}');
