-- Pokemon Publisher v2 > node "Log Posted"
-- Backup de 13/08/2026.

=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $("Format PT-BR Message").item.json.item_id }}', 'posted', 'publicado no telegram');
