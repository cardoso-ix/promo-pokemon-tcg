-- Pokemon Store Scanner > node "Log Descartado Loja"
-- Backup de 13/08/2026.

=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $json.item_id }}', 'descartado', '{{ $json.reason }}');
