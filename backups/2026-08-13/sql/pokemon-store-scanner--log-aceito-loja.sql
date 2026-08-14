-- Pokemon Store Scanner > node "Log Aceito Loja"
-- Backup de 13/08/2026.

=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $('Extrair Ofertas das Lojas').item.json.item_id }}', '{{ $json.item_id ? 'aceito' : 'duplicado' }}', '{{ $('Extrair Ofertas das Lojas').item.json.reason }}');
