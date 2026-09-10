# Banco de dados — réplica

O banco guarda rotas, ajustes e o diário da réplica. O Ingest e o painel só se falam
por aqui.

---

## Onde ele está

| Item | Valor |
| --- | --- |
| Servidor | VPS `srv1897392.hstgr.cloud` |
| Container | `pokemon-postgres` (`postgres:16-alpine`) |
| Rede | `n8n_default` (a mesma do n8n) |
| Banco | `pokemon_promos` |
| Usuário | `pokemon_bot` |
| Porta | 5432 só em `127.0.0.1` |
| Volume | `postgres_data` |
| Credencial n8n | Pokemon Promos DB, `6jdqiaTfNIJseSqb` |

A senha fica **só** na credencial e no container. **A senha efetiva não é a do `.env`:**
o `$` do meio foi comido pelo Compose. O banco aceita `PkmnPromos2026!Br`.
Detalhe em [runbook](runbook.md) e [P5](troubleshooting.md#p5--credencial-do-banco-para-de-conectar-couldnt-connect-with-these-settings).

Como consultar: [runbook, seção 2](runbook.md#2-como-rodar-uma-consulta-sql).

---

## Schema `evolution`

Mesmo Postgres, schema separado, criado pelo `Replica Schema Setup` e populado pela
Evolution. **Não mexa à mão:** a sessão do WhatsApp mora ali. Apagar = escanear o QR de novo.

---

## Tabelas `promos_*` (arquivo morto)

`promos`, `promos_log`, `promos_erros`, `promos_review`, `cupons`, `lojas_confiaveis` e
afins **ainda existem**. A curadoria que as escrevia foi arquivada em 31/08. Não apague
sem pedido explícito — é irreversível e a réplica **não** as usa.

---

## Tabelas da réplica

Quem cria `replica_rotas`, `replica_config` e `replica_log` é o `Replica Schema Setup`
(`pfolFnCYTLyLZdwU`). `replica_destinos` e `replica_transmissoes` nascem no primeiro
GET do painel.

| Tabela | Papel | Quem escreve | Quem lê |
| --- | --- | --- | --- |
| `replica_rotas` | Catálogo de grupos WA + contadores | Painel (sync) e Ingest (contador) | Painel (combo) |
| `replica_transmissoes` | Rotas nomeadas (toggle ATIVA) | Painel | Ingest |
| `replica_transmissao_origens` / `_destinos` | Origens e destinos de cada rota | Painel | Ingest |
| `replica_config` | Ajustes chave/valor | Painel | Ingest |
| `replica_log` | Diário + dedup | Ingest | Painel e você |
| `replica_destinos` | Catálogo Telegram/WhatsApp | Painel | Painel |

### `replica_rotas`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | `BIGSERIAL` | PK |
| `chat_id` | `TEXT NOT NULL UNIQUE` | JID `…@g.us` |
| `nome` | `TEXT` | Título cacheado (Nomes Sync) ou apelido |
| `plataforma` | `TEXT NOT NULL DEFAULT 'whatsapp'` | |
| `ativa` | `BOOLEAN NOT NULL DEFAULT FALSE` | `TRUE` se é origem de alguma rota ligada |
| `criada_em` | `TIMESTAMPTZ` | |
| `ultima_mensagem` | `TIMESTAMPTZ` | |
| `mensagens_vistas` | `INTEGER` | Toda mensagem, mesmo a que não replica |
| `replicadas` | `INTEGER` | As que saíram no destino |

### `replica_destinos`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `plataforma` | `TEXT` | `telegram` ou `whatsapp` |
| `identificador` | `TEXT` | `@promopokemontcg` ou JID |
| `nome` | `TEXT` | Rótulo |
| `ativo` | `BOOLEAN` | Desligar o Telegram em Conexões marca `FALSE` |

Único em `(plataforma, identificador)`. Origem = destino WhatsApp é recusado (loop).

### `replica_transmissoes`

Uma linha por rota nomeada. `replica_transmissao_origens` liga `(transmissao_id, chat_id)`.
`replica_transmissao_destinos` liga `(transmissao_id, plataforma, identificador)`.
Apagam em cascata. DDL em `backups/2026-08-28/sql/replica-schema-setup--criar-transmissoes.sql`.

Se ainda não houver transmissão, o ingest cai no legado `replica_rotas.ativa` +
`replica_destinos`.

### `replica_config`

| Chave | Semeado | O que faz |
| --- | --- | --- |
| `ativo` | `true` | Liga/desliga a esteira |
| `destino_telegram` | `@promopokemontcg` | Canal |
| `delay_segundos` | `8` | Espera antes de publicar |
| `teto_hora` | `40` | Anti-flood |
| `replicar_cupom_sem_link` | `true` | Cupom sem produto também replica |
| `afiliado_matt_word` | `caed1312314` | Apelido |
| `afiliado_matt_tool` | `96097202` | Etiqueta |
| `frases_remover` | *(vazio)* | Extras; `@rasgabooster.tcg` já sai no código |
| `pagina_gz` | HTML em base64 UTF-8 | **Não é gzip.** Completo: 71364 bytes, MD5 `adf87ccf658e4b089798562cb99255f6`. **Um escritor só** |
| `save_token` | token longo | Autentica POSTs do painel. Não colar o valor aqui |

### `replica_log`

| Coluna | Observação |
| --- | --- |
| `hash_conteudo` | **UNIQUE — é o dedup.** Texto sem links + item IDs |
| `texto_original` / `texto_publicado` | Antes e depois |
| `links_convertidos` | Quantos links do ML viraram afiliado |
| `status` | `pendente`, `enviado`, `descartado`, `ignorado`, `erro` |
| `motivo` | Por que não saiu |
| `telegram_message_id` | Post no canal |
| `enviado_em` | O que o teto por hora conta |

`INSERT … ON CONFLICT (hash_conteudo) DO NOTHING`: sem linha de volta, não publica.
A mesma promoção em três grupos sai uma vez.

Índices: `idx_replica_log_criado`, `idx_replica_log_status`, `idx_replica_log_origem`,
`idx_replica_rotas_ativa`.
