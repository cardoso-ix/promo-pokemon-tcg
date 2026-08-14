-- Pokemon Store Scanner > node "Buscar Lojas Ativas"
-- Backup de 13/08/2026.

SELECT slug, nome, official_store_id, owner_id, storefront_id, prioridade, desconto_minimo, preco_minimo, preco_maximo, filtro_titulo FROM lojas_confiaveis WHERE ativa = TRUE ORDER BY prioridade ASC, id ASC;
