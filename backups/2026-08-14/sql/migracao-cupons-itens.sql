ALTER TABLE promos ADD COLUMN IF NOT EXISTS loja_slug TEXT;
UPDATE promos SET loja_slug = replace(search_term, 'loja:', '')
 WHERE search_term LIKE 'loja:%' AND coalesce(loja_slug, '') = '';

CREATE TABLE IF NOT EXISTS cupons_itens (
    id          BIGSERIAL PRIMARY KEY,
    cupom_id    BIGINT NOT NULL REFERENCES cupons(id) ON DELETE CASCADE,
    item_id     TEXT NOT NULL,
    catalog_id  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (cupom_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_cupons_itens_item ON cupons_itens(item_id);
CREATE INDEX IF NOT EXISTS idx_cupons_itens_catalog ON cupons_itens(catalog_id);

UPDATE cupons SET
    ativo = TRUE,
    valido_ate = '2026-08-16 23:59:00-03',
    valor_minimo_cents = 5900,
    descricao = '15% OFF em brinquedos selecionados (teto R$ 50)',
    observacao = 'liberado item a item pelo Eduardo em 14/08/2026; nao colar fora da lista'
WHERE codigo = 'BRINQUEDOS';

INSERT INTO cupons_itens (cupom_id, item_id, catalog_id)
SELECT c.id, v.item_id, v.catalog_id
FROM cupons c
CROSS JOIN (VALUES
    ('MLB4836905147', 'MLB74460211'),
    ('MLB7323847360', 'MLB75010637'),
    ('MLB7077055110', 'MLB74773271'),
    ('MLB4790321711', 'MLBU4111646163'),
    ('MLB7077055152', 'MLB74743819'),
    ('MLB7142373896', 'MLB69330855'),
    ('MLB7397651634', 'MLB76466872'),
    ('MLB5930202958', 'MLB61700105'),
    ('MLB4940433387', 'MLB69246167'),
    ('MLB6593480074', 'MLBU3885771297')
) AS v(item_id, catalog_id)
WHERE c.codigo = 'BRINQUEDOS'
ON CONFLICT (cupom_id, item_id) DO UPDATE SET catalog_id = EXCLUDED.catalog_id;

UPDATE promos
   SET utm_link = utm_link || '&wid=' || item_id
 WHERE status = 'pending'
   AND utm_link LIKE '%matt_word=%'
   AND utm_link NOT LIKE '%wid=%';

SELECT jsonb_build_object(
  'brinquedos', (SELECT jsonb_build_object('id', id, 'ativo', ativo, 'valido_ate', valido_ate) FROM cupons WHERE codigo = 'BRINQUEDOS'),
  'itens', (SELECT count(*)::int FROM cupons_itens ci JOIN cupons c ON c.id = ci.cupom_id WHERE c.codigo = 'BRINQUEDOS'),
  'pending_com_wid', (SELECT count(*)::int FROM promos WHERE status = 'pending' AND utm_link LIKE '%wid=%'),
  'coluna_loja_slug', (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'promos' AND column_name = 'loja_slug')
) AS resultado;
