=UPDATE promos SET status = 'blocked', blocked_reason = '{{ $json.motivo }}' WHERE item_id = '{{ $json.item_id }}';
INSERT INTO promos_erros (item_id, error_step, error_msg) VALUES ('{{ $json.item_id }}', 'preco', '{{ $json.motivo }}');
INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $json.item_id }}', 'blocked', '{{ $json.motivo }}');