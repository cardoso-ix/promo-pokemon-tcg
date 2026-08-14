-- Pokemon Scanner v2 > node "Log Parse Error"
-- Backup de 13/08/2026.

=INSERT INTO promos_erros (item_id, payload, error_step, error_msg) VALUES (NULL, '{{ $json.payload_json }}'::jsonb, 'busca', '{{ $json.error_msg }}');
