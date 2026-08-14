-- Pokemon Store Scanner > node "Log Varredura da Loja"
-- Backup de 13/08/2026.

=INSERT INTO promos_log (item_id, decision, reason) VALUES (NULL, 'varredura_loja', '{{ $('Extrair Ofertas das Lojas').item.json.reason }}');
