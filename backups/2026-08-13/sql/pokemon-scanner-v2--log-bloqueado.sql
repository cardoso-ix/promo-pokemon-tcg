-- Pokemon Scanner v2 > node "Log Bloqueado"
-- Backup de 13/08/2026.

=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $("Normalize and Classify").item.json.item_id }}', '{{ $json.item_id ? "bloqueado" : "duplicado" }}', '{{ $("Normalize and Classify").item.json.reason }}');
