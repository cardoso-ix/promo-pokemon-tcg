-- Pokemon Publisher v2 > node "Log Publish Error"
-- Backup de 13/08/2026.

=INSERT INTO promos_erros (item_id, error_step, error_msg) VALUES ('{{ $("Format PT-BR Message").item.json.item_id }}', 'post', 'telegram send failed');
