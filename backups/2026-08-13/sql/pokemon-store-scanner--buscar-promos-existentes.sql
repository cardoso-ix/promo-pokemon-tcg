-- Pokemon Store Scanner > node "Buscar Promos Existentes"
-- Backup de 13/08/2026.

SELECT item_id, title, price_cents, permalink, status, COALESCE(search_term, '') AS search_term FROM promos WHERE created_at > NOW() - INTERVAL '120 days' ORDER BY id DESC LIMIT 5000;
