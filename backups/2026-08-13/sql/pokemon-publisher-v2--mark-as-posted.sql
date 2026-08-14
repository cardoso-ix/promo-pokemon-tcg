-- Pokemon Publisher v2 > node "Mark as Posted"
-- Backup de 13/08/2026.

=UPDATE promos SET status = 'posted', posted_at = NOW(), telegram_message_id = {{ $json.result.message_id }} WHERE item_id = '{{ $("Format PT-BR Message").item.json.item_id }}';
