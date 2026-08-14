-- Pokemon Publisher v2 > node "Log Nao Publicavel"
-- Backup de 13/08/2026.

=INSERT INTO promos_erros (item_id, error_step, error_msg) VALUES ('{{ $json.item_id }}', '{{ $json.etapa }}', 'nao publicado ({{ $json.etapa }}): {{ $json.motivo }}');
