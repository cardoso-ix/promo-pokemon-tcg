import { workflow, node, trigger, sticky, newCredential, switchCase, expr } from '@n8n/workflow-sdk';

const manual = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Rodar na Mao', position: [240, 300] }
});

const diario = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'As 7h BRT',
    position: [240, 480],
    parameters: {
      rule: {
        interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }]
      }
    }
  }
});

const jitter = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Jitter Inicial',
    position: [480, 380],
    parameters: {
      resume: 'timeInterval',
      amount: expr('{{ Math.floor(Math.random() * 16) }}'),
      unit: 'seconds'
    }
  }
});

const buscarPromos = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Buscar Promos Existentes',
    position: [720, 380],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "SELECT item_id, title, price_cents, permalink, status, COALESCE(search_term, '') AS search_term FROM promos WHERE created_at > NOW() - INTERVAL '120 days' ORDER BY id DESC LIMIT 5000;"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const buscarLojas = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Buscar Lojas Ativas',
    position: [960, 380],
    executeOnce: true,
    parameters: {
      operation: 'executeQuery',
      query: 'SELECT slug, nome, official_store_id, owner_id, storefront_id, prioridade, desconto_minimo, preco_minimo, preco_maximo, filtro_titulo FROM lojas_confiaveis WHERE ativa = TRUE ORDER BY prioridade ASC, id ASC;'
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const filtrarLoja = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Filtrar Loja de Teste',
    position: [1200, 380],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "// true = so a loja pokemon (10 creditos). false = todas as lojas ativas.\nconst TESTE_SO_POKEMON = true;\nconst items = $input.all();\nif (!TESTE_SO_POKEMON) return items;\nreturn items.filter(function (it) {\n  return it && it.json && String(it.json.slug) === 'pokemon';\n});\n"
    }
  }
});

const baixar = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Baixar Catalogo da Loja',
    position: [1440, 380],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'http://api.scraperapi.com/',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpQueryAuth',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          { name: 'url', value: '=https://lista.mercadolivre.com.br/loja/{{ $json.slug }}/pokemon' },
          { name: 'render', value: 'true' },
          { name: 'country_code', value: 'br' }
        ]
      },
      options: {
        timeout: 120000,
        batching: { batch: { batchSize: 1, batchInterval: 20000 } },
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } }
      }
    },
    credentials: { httpQueryAuth: newCredential('ScraperAPI Query Auth') }
  }
});

const extrair = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Extrair Ofertas do Catalogo',
    position: [1680, 380],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "return [{ json: { decisao: 'erro_parser', slug: '', error_msg: 'parser ainda nao instalado', payload_json: '{}' } }];"
    }
  }
});

const injetar = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Injetar Wid e Loja',
    position: [1920, 380],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const items = $input.all();\nconst out = [];\nfor (const it of items) {\n  const d = Object.assign({}, it.json);\n  if (d.decisao === 'aceito') {\n    const id = String(d.item_id || '');\n    let u = String(d.utm_link || '');\n    if (id && u && u.indexOf('wid=') < 0) {\n      u = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'wid=' + encodeURIComponent(id);\n      d.utm_link = u;\n      d.utm_link_bruto = u;\n    }\n    if (!d.loja_slug && d.slug) d.loja_slug = String(d.slug);\n  }\n  out.push({ json: d });\n}\nreturn out;\n"
    }
  }
});

const rotear = switchCase({
  version: 3.2,
  config: {
    name: 'Rotear Decisao do Catalogo',
    position: [2160, 380],
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
          outputKey: "aceito",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "aceito"
            }],
            combinator: 'and'
          }
        },
          {
          outputKey: "descartado",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "descartado"
            }],
            combinator: 'and'
          }
        },
          {
          outputKey: "resumo",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "resumo"
            }],
            combinator: 'and'
          }
        },
          {
          outputKey: "erro_parser",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "erro_parser"
            }],
            combinator: 'and'
          }
        }
        ]
      },
      options: { fallbackOutput: 'none' }
    }
  }
});

const inserir = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Inserir Promo do Catalogo',
    position: [2480, 160],
    onError: 'continueErrorOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=WITH antigo AS (\n  SELECT item_id, price_cents\n  FROM promos\n  WHERE item_id = '{{ $json.item_id }}'\n), gravado AS (\n  INSERT INTO promos (item_id, title, price_cents, original_price_cents, discount_pct, seller_reputation, seller_sales, category_id, thumbnail, permalink, utm_link, status, search_term, loja_slug, idioma, idioma_confianca) VALUES ('{{ $json.item_id }}', '{{ $json.title }}', {{ $json.price_cents }}, {{ $json.original_price_cents }}, {{ $json.discount_pct }}, {{ $json.seller_reputation_sql }}, {{ $json.seller_sales_sql }}, {{ $json.category_id_sql }}, '{{ $json.thumbnail }}', '{{ $json.permalink }}', '{{ $json.utm_link }}', 'pending', '{{ $json.search_term }}', NULLIF('{{ $json.loja_slug }}',''), {{ $json.idioma_sql }}, {{ $json.idioma_confianca_sql }})\n  ON CONFLICT (item_id) DO UPDATE SET title = EXCLUDED.title, price_cents = EXCLUDED.price_cents, original_price_cents = EXCLUDED.original_price_cents, discount_pct = EXCLUDED.discount_pct, thumbnail = EXCLUDED.thumbnail, permalink = EXCLUDED.permalink, utm_link = EXCLUDED.utm_link, idioma = EXCLUDED.idioma, idioma_confianca = EXCLUDED.idioma_confianca, category_id = EXCLUDED.category_id, loja_slug = EXCLUDED.loja_slug, status = 'pending', posted_at = NULL, telegram_message_id = NULL, blocked_reason = NULL\n  WHERE promos.status = 'posted' AND EXCLUDED.price_cents < promos.price_cents AND ((promos.price_cents - EXCLUDED.price_cents) * 100 >= promos.price_cents * 5 OR (promos.price_cents - EXCLUDED.price_cents) >= 500) AND COALESCE(EXCLUDED.utm_link, '') LIKE '%matt_word=caed1312314%' AND COALESCE(EXCLUDED.utm_link, '') LIKE '%matt_tool=96097202%' AND COALESCE(EXCLUDED.thumbnail, '') LIKE 'http%' AND NOT EXISTS (SELECT 1 FROM promos_log pl WHERE pl.item_id = promos.item_id AND pl.decision = 'repost' AND pl.created_at > NOW() - INTERVAL '1 day')\n  RETURNING item_id, price_cents, (xmax = 0) AS inserido\n)\nSELECT g.item_id,\n  CASE WHEN g.inserido THEN 'aceito' ELSE 'repost' END AS decision,\n  CASE WHEN g.inserido THEN NULL ELSE 'repost | R$ ' || replace(to_char(a.price_cents / 100.0, 'FM999990.00'), '.', ',') || ' -> R$ ' || replace(to_char(g.price_cents / 100.0, 'FM999990.00'), '.', ',') || ' | queda no catalogo (polycard)' END AS reason_repost\nFROM gravado g\nLEFT JOIN antigo a ON TRUE;"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logAceito = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Aceito Catalogo',
    position: [2720, 80],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $('Extrair Ofertas do Catalogo').item.json.item_id }}', '{{ $json.decision ? $json.decision : ($json.item_id ? 'aceito' : 'duplicado') }}', '{{ $json.reason_repost ? $json.reason_repost : $('Extrair Ofertas do Catalogo').item.json.reason }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logErroInsert = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Erro de Insert Catalogo',
    position: [2720, 240],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_erros (item_id, payload, error_step, error_msg) VALUES ('{{ $('Extrair Ofertas do Catalogo').item.json.item_id }}', '{{ $('Extrair Ofertas do Catalogo').item.json.payload_erro }}'::jsonb, 'catalogo', '{{ String($json.error || 'falha ao inserir promo vinda do catalogo').split(String.fromCharCode(39)).join(String.fromCharCode(39) + String.fromCharCode(39)).slice(0, 400) }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logDescartado = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Descartado Catalogo',
    position: [2480, 380],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $json.item_id }}', 'descartado', '{{ $json.reason }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logVarredura = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Varredura Catalogo',
    position: [2480, 540],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_log (item_id, decision, reason) VALUES (NULL, 'varredura_catalogo', '{{ $('Extrair Ofertas do Catalogo').item.json.reason }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logParser = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Parser Quebrado Catalogo',
    position: [2480, 700],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_erros (item_id, payload, error_step, error_msg) VALUES (NULL, '{{ $json.payload_json }}'::jsonb, 'catalogo', '{{ $json.error_msg }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const notaCredencial = sticky({
  content: 'Credencial ScraperAPI: crie Query Auth com parametro api_key e nome ScraperAPI Query Auth. Sem isso a HTTP falha. Workflow nasce INATIVO. TESTE_SO_POKEMON=true no node Filtrar Loja de Teste (10 creditos).',
  config: { name: 'Nota credencial', position: [240, 40], width: 420, height: 220 }
});

const notaCusto = sticky({
  content: 'Custo: pagina 1 com render=true = 10 creditos/loja. Nao misturar no Store Scanner de 5 min. Cron 07:00 no relogio do n8n (America/Sao_Paulo). Pagina 2+ fora desta versao.',
  config: { name: 'Nota custo', position: [720, 40], width: 380, height: 220 }
});

inserir.onError(logErroInsert);

export default workflow('pokemon-catalog-scanner', 'Pokemon Catalog Scanner')
  .add(notaCredencial)
  .add(notaCusto)
  .add(manual)
  .to(jitter)
  .add(diario)
  .to(jitter)
  .to(buscarPromos)
  .to(buscarLojas)
  .to(filtrarLoja)
  .to(baixar)
  .to(extrair)
  .to(injetar)
  .to(rotear
    .onCase(0, inserir.to(logAceito))
    .onCase(1, logDescartado)
    .onCase(2, logVarredura)
    .onCase(3, logParser)
  );
