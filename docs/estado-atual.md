# Estado atual — o que está rodando e o que falta decidir

**Última atualização:** 02/09/2026

> **Novidade de 27/08: o projeto agora tem duas esteiras.** A de curadoria (tudo descrito
> abaixo) segue igual e no ar. A segunda é a **réplica de grupos de WhatsApp**, que copia
> promoção de terceiro trocando só o link de afiliado, **sem nenhum filtro**
> ([Decisão 44](historico-de-decisoes.md#decisão-44--réplica-de-grupos-de-whatsapp-sem-curadoria-ao-lado-do-bot)).
> Em 28/08 ela saiu do papel: Evolution API no ar, credenciais criadas, workflows
> publicados, WhatsApp pareado. Em 29/08 a primeira rota nomeada (**TCG Promo**) já estava
> gravada e o HTML do painel fechou em `pagina_gz`
> ([Decisão 51](historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz)).
> Passo a passo em [runbook, seção 15](runbook.md#15-a-esteira-de-réplica-de-whatsapp).
> Estado detalhado em [A esteira de réplica](#a-esteira-de-réplica--no-ar).
**Situação:** **o bot está no ar de ponta a ponta e só publica com link de afiliado e com
foto.** Dez lojas ativas (`dalo-vendas` entrou à noite, autorização do Eduardo), desconto mínimo **10%** em `pokemon`/`copag` e **15%** nas outras
([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)), teto
**90**/dia (contado em **BRT**) e **6**/hora. Store Scanner a cada **5 min**, Scanner v2
(busca geral MLB6899) a cada **10 min**, Publisher a cada **2 min** (8h–22h BRT). Item já postado volta à fila se o preço cair (≥ 5% ou ≥ R$ 5)
ou se continuar válido **depois de 3 dias**
([Decisão 40](historico-de-decisoes.md#decisão-40--reofertar-após-3-dias-e-contar-o-teto-em-brt)).
Link de compra leva `wid`. Publisher `56b8fb7b`, Store Scanner `0ff36da8`, Scanner v2 `f0183d1c`.
Filtro vigente nas lojas: cartas/acessório TCG **ou** figura Pokémon
([Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova)).
Busca geral exige Pokémon no título + score de autenticidade
([Decisão 43](historico-de-decisoes.md#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora)).
O `Pokemon Catalog Scanner` **existe e fica inativo** — `lista.mercadolivre.com.br` falhou
com `render=true` e com `premium=true` em 16/08
([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).

Este documento existe para permitir retomar sem repetir nenhum teste pago e sem refazer
investigação que já foi feita.

**Como retomar em 5 minutos**

1. README → o bot está no ar? 10 lojas + busca geral, 5 min / 10 min / 2 min, teto 90 + 6/hora, mínimo 10%/15%,
   filtro de cartas/acessório + figura (Decisão 41), Pokémon no título na busca geral (Decisão 43). Catalog Scanner **não** se publica.
2. Este arquivo → versões publicadas, ScraperAPI, o que falta decidir.
3. n8n: `versionId` = `activeVersionId` nos ativos. Salvar ≠ publicar ([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).
4. Não gaste crédito de ScraperAPI sem ler a [Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo).
   O Catalog Scanner **não se publica**. `ultra_premium` só com pedido novo.
5. Clique de afiliado **já confirmado** (5 cliques em 13/08). Falta venda/comissão.

---

## Resumo em quatro linhas

1. **Link de afiliado: resolvido.** Corrigido nos dois scanners e regravado nos 4 itens que
   estavam na fila. Os 4 posts do dia saíram com comissão.
2. **Bot no ar, com duas travas.** Scanner e Publisher ativos. Nenhum post sai sem link de
   afiliado ([Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado))
   nem sem foto ([Decisão 26](historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila)).
   Com isso, o [P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha)
   está fechado nas duas causas conhecidas.
3. **Volume: dez lojas, qualidade primeiro (Decisão 35, ~22h35; `dalo-vendas` em 16/08).**
   Mínimo **10%** em `pokemon`/`copag`, **15%** nas outras oito. Teto vigente **90**/dia e **6**/hora
   ([Decisão 43](historico-de-decisoes.md#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora); era 40, e o horário era 4 na
   noite de 13/08; [Decisão 38](historico-de-decisoes.md#decisão-38--teto-horário-de-6-posts)).
   Fila ordena Pokémon → COPAG → economia em R$ → %. O experimento de 5% (Decisão 29) acabou.
   A varredura das ~20h de 13/08 rendeu **1 pending novo** (Attack Toys, 9,75%), já publicado
   (`message_id` 23) — na época o mínimo ainda era 5%; hoje 9,75% na Attack Toys **não**
   entra. **Psz3D cadastrada** depois, a pedido do Eduardo.
4. **Catálogo completo da loja: workflow criado, inativo (Decisão 42, ~23h10).**
   Em 13/08 a página 1 passou com `render=true`. Em 16/08 a mesma rota (e `premium=true`)
   devolve HTTP 500 em ~56 s, sem cobrar. Parser nunca viu HTML nesta sessão.
5. **Repost por queda de preço (Decisão 33, ~22h).** Mesmo `item_id` já `posted` com polycard
   mais barato (≥ 5% ou ≥ R$ 5, no máximo 1/dia) volta a `pending`. Scanner publicado
   (`2f6fa3c8`). Publisher inalterado **naquela hora**; depois veio o Pacote A (`a621b8c9`).
   Blister de R$ 64,31 **não** foi reenfileirado à mão.
6. **Ritmo da noite (Decisão 34, ~22h).** Store Scanner passou de 10 para **5 min**; Publisher
   de 5 para **2 min**. Conferido ao vivo: Scanner dispara :00/:05/:10…; Publisher :00/:02/:04…
   e depois das 22h BRT termina em ~10 ms na janela fechada. **Não voltar o Scanner para 2 min**
   (10 HTTP por ciclo).
7. **Pacote A no ar (Decisão 35, ~22h35).** Publisher naquela hora: `a621b8c9`. Em 14/08
   o teto horário subiu para 6 e a versão publicada passou a `57c2826e`. Banco: 10%/15%.
   Pending abaixo do novo mínimo: zero na hora da troca de 13/08.
8. **Busca geral religada (Decisão 43, 25/08 ~22h15).** Scanner v2 ativo (`f0183d1c`),
   Pokémon no título obrigatório, teto diário **90**. Teste `35851` ok; 0 aceito na vitrine
   da noite. Posts a partir das 8h de 26/08 se a fila encher. Catalog Scanner continua
   inativo.

**Alerta privado no ar (19h35).** O `Pokemon Health Alert` avisa no mesmo chat do alerta
LinkedIn se o bot quebrar. Fila vazia **não** é alerta. Ver
[runbook, seção 14](runbook.md#14-alerta-privado-de-saúde-do-bot) e
[Decisão 28](historico-de-decisoes.md#decisão-28--alerta-privado-de-saúde-no-mesmo-chat-do-linkedin).

---

## Estado dos workflows no n8n

Conferido no n8n em **27/08/2026 ~23h BRT** (os quatro ativos continuam com
`versionId` = `activeVersionId`), comparando `versionId` com `activeVersionId` — porque salvar e
publicar são coisas diferentes
([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

| Workflow | ID | Estado | Produção em dia? |
| --- | --- | --- | --- |
| `Pokemon Store Scanner` | `PNwaF3BYhj5KA8eY` | **Ativo**, a cada **5 min** + jitter 0–60s | Sim, `0ff36da8` — queda de preço + reoferta após 3 dias ([Decisão 40](historico-de-decisoes.md#decisão-40--reofertar-após-3-dias-e-contar-o-teto-em-brt)). Node do relógio: `A Cada 5 Minutos` |
| `Pokemon Publisher v2` | `FXNWeT9C7dEA0DUY` | **Ativo**, a cada **2 min** | Sim, `56b8fb7b` — teto **6**/hora + teto **90** no **dia BRT**. Node do relógio: `Every 2 Minutes` |
| `Pokemon Scanner v2` | `39kdRchYI6CwsbNY` | **Ativo**, a cada **10 min** + jitter | Sim, `f0183d1c` — busca geral MLB6899 + Pokémon no título ([Decisão 43](historico-de-decisoes.md#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora)). Node extra: `Exigir Pokemon no Titulo` |
| `Pokemon Health Alert` | `3irgeWFKZGZZrJ5u` | **Ativo**, 1× ao dia às 21h BRT + manual | Sim, `b5e4b758` — mesmo chat privado do alerta LinkedIn |
| `Pokemon Schema Setup v2` | `F8jVi6NFxeDHfAkb` | Inativo, roda sob demanda | Nunca publicado |
| `Replica WhatsApp Ingest` | `4mE343XrNXgIwAIF` | **Ativo** | Sim, `70be8ff6` — foto do polycard + nome na legenda; só replica marketplace com afiliação (ML). Amazon descarta ([Decisão 54](historico-de-decisoes.md#decisão-54--só-replicar-marketplace-com-afiliação)) |
| `Replica Painel` | `lWDnggRX8xQmYyQV` | **Ativo** | Sim, `4a6a1223` — Config com plataformas (Amazon visualmente apagada); HTML em `pagina_gz` 70760 ([Decisão 53](historico-de-decisoes.md#decisão-53--o-painel-grava-os-ajustes-da-lista-branca-e-o-html-sobe-por-script), [Decisão 54](historico-de-decisoes.md#decisão-54--só-replicar-marketplace-com-afiliação)). Login em `/webhook/replica/entrar`. Ctrl+F5 se JS parecer cortado |
| `Replica Nomes Sync` | `J6zU6p48OEBO0raf` | **Ativo**, a cada **10 min** | Sim, `5c1adb11` — `fetchAllGroups` (~80s, timeout 120s) + cache em `replica_rotas` |
| `Replica Schema Setup` | `pfolFnCYTLyLZdwU` | Inativo, **já rodou** em 27/08 | Idempotente, de mão. Criou `replica_rotas`, `replica_config`, `replica_log` |
| `Pokemon Catalog Scanner` | `2ckVyvFPvtqwECDI` | **Arquivado** em 27/08 | Era inativo desde 16/08 ([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)). Arquivar é reversível; o código está em [`backups/2026-08-16/`](../backups/2026-08-16/) |
| `TMP Pokemon SQL Console` | `PVNsBGQ92Wrhos51` | **Arquivado** em 13/08 | Era descartável. Some da lista |
| `TMP Pokemon SQL Console 2` | `Fc7OGlP4ZNiuNIgd` | **Arquivado** em 27/08 | Tinha webhook ativo executando SQL arbitrário. Superfície de risco sem dono |
| `TMP Reset Entrada Paciente` | `uvR7cjFb1dB3XWW7` | Inativo, de outro projeto | **Ainda na lista.** Não dá para arquivar por programa (MCP desabilitado nele); arquive pelo cartão do workflow |

Scanner v2 **publicado e ativo** na Decisão 43. Schema Setup nunca publicado é inofensivo
enquanto ninguém o ligar.

**Limpeza de 27/08:** três workflows saíram da lista (Catalog Scanner, os dois TMP). O critério
foi "não tem dono e não roda"; o `TMP Pokemon SQL Console 2` saiu também por segurança, porque
um webhook publicado que executa SQL arbitrário é convite para problema. Arquivar **não** apaga:
dá para desarquivar pelo filtro de arquivados do n8n.

A pasta [`backups/2026-08-13/`](../backups/) tem os 4 workflows originais daquele dia.
[`backups/2026-08-16/`](../backups/2026-08-16/) guarda o parser e o gerador do Catalog
Scanner **inativo**. [`backups/2026-08-27/`](../backups/2026-08-27/) guarda os Code nodes, o SQL
e o HTML antigo do painel, e [`backups/2026-08-28/`](../backups/2026-08-28/) o que nasceu no
dia de pôr a réplica de pé (QR, schema `evolution`, painel origem/destino). O n8n
continua sendo a fonte; o backup é paraquedas.

---

## A esteira de réplica — no ar

Construída em 27/08 ([Decisão 44](historico-de-decisoes.md#decisão-44--réplica-de-grupos-de-whatsapp-sem-curadoria-ao-lado-do-bot)),
posta de pé em 28/08. **Já publicou o primeiro post ao vivo.** O 401 no Salvar era o Chrome
sem reenviar Basic Auth no `fetch` — corrigido em `45412383`
([Decisão 47](historico-de-decisoes.md#decisão-47--token-de-save-no-json-porque-o-chrome-não-reenvia-basic-auth-no-fetch)).
O post saía com `@rasgabooster.tcg` e sem foto no WhatsApp; o ingest `94138475` tira a marca
e copia a imagem ([Decisão 48](historico-de-decisoes.md#decisão-48--post-da-réplica-no-modelo-foto--texto-sem-marca-de-terceiro)).

**O que já está pronto:**

- As tabelas `replica_rotas`, `replica_config` e `replica_log` existem no banco `pokemon_promos`.
  `replica_destinos` e `replica_transmissoes` (rotas nomeadas) nascem no primeiro GET do painel.
- **Evolution API rodando** na VPS como projeto Docker `evolution-api`, sem porta pública, no
  schema `evolution` do mesmo Postgres. Instância `promo-replica` **conectada** ao WhatsApp
  desde 28/08 19h28 (número terminado em 5955).
- **Credenciais `Painel Replica` e `Evolution API Key` criadas** e vinculadas nos sete nodes
  que precisam delas.
- **Quatro workflows publicados:** `Replica WhatsApp Ingest`, `Replica Painel`,
  `Replica WhatsApp Conectar` e `Replica Nomes Sync`. O painel tem Visão Geral (KPIs 7d,
  status WA/TG, gráfico de envios, tabela de rotas e atividades), Conexões
  (QR + Telegram `@`), Rotas nomeadas (cards + modal com digitador), Configurações e
  Atividades. O GET do painel **não** chama `fetchAllGroups`/`findChats`; os títulos
  vêm do cache `replica_rotas.nome`. O job `Replica Nomes Sync` descobre os `@g.us`
  via `fetchAllGroups` (~80 s, fora do GET) e grava o cache; o GET só lê o banco (~25 ms).
  Em 28/08 o combo passou de 10 para **169** grupos. `evolution."Chat"` continua vazio
  (`DATABASE_SAVE_DATA_CHATS=false`) — não use Chat como fonte.
  Em 29/08 o POST publicado passou a aceitar `frases_remover` (`5a4d014a`). O HTML
  polido (Impeccable) está em [`backups/2026-08-28/painel/replica-painel.html`](../backups/2026-08-28/painel/replica-painel.html)
  e em `replica_config.pagina_gz` **completo** (02/09: 67532 bytes, MD5
  `d22596c0999a0f339a4d063ae84555a6`; HTML 50649, MD5 `11eb41c8749e30eb28a4a1c751d56bd8`).
  A aba Configurações grava teto, delay, afiliado, atraso máximo, limite de legenda
  e `formato_post`. Login versionado em `replica-login.html`. Publicar:
  `python3 tools/publicar-painel.py` ([Decisão 53](historico-de-decisoes.md#decisão-53--o-painel-grava-os-ajustes-da-lista-branca-e-o-html-sobe-por-script)).
  A coluna guarda base64 UTF-8 do HTML, não gzip — o nome é legado.
  O workflow temporário `TESTE card telegram (apagar)` (`JuTS329uRCmflTBl`) foi arquivado.
  Primeira rota nomeada: **TCG Promo** (1 origem, 2 destinos). Combo com ~170 grupos.
  Ingest ao vivo: webhook da Evolution lendo grupo, envios reais na noite de 28/08.
- O `Replica WhatsApp Ingest` passou por teste de ponta a ponta com dados fixados (`pinData`)
  simulando o webhook da Evolution, o banco, os encurtadores e o Telegram. **A troca de link e a
  limpeza do texto saíram corretas no teste.**
- O webhook de entrada foi movido para um caminho com segredo. O caminho antigo
  (`/webhook/replica/wa`) **não** responde mais.

**O que falta:**

| # | Falta | Como fazer |
| --- | --- | --- |
| 1 | Entrar em mais grupos com o número pareado, se quiser mais origem | A Evolution só vê grupo do qual o número participa |
| 2 | **Dashboard único** (curadoria + réplica na mesma página) | [roadmap, Dashboard](roadmap.md#dashboard) — Fase 1 ainda não começou |

**Três armadilhas que custaram a noite de 28/08 e estão documentadas no runbook:** a imagem
`atendai/evolution-api` não sobe nesta VPS (usar `evoapicloud/evolution-api`); a senha real do
Postgres é `PkmnPromos2026!Br`, não a que está escrita no `.env` — o `$` do meio foi comido pelo
Compose quando o banco nasceu; e o webhook da Evolution precisa apontar para `http://n8n:5678`,
porque o domínio público resolve para `127.0.1.1` de dentro do container.

**Ainda em aberto:** o **dashboard único**, que o Eduardo quer para controlar as duas esteiras
num lugar só. O `Replica Painel` cobre apenas a réplica; a curadoria continua sendo operada por
SQL e pela tela do n8n. O desenho e as duas escolhas em aberto estão em
[roadmap, Dashboard](roadmap.md#dashboard).

**O que já foi provado em produção (28–29/08 e 02/09):** o webhook real da Evolution chega no ingest
(centenas de eventos, inclusive reações `sem_texto` descartadas); a foto oficial do anúncio
sai do polycard do encurtador mesmo quando a origem veio só com texto
([Decisão 52](historico-de-decisoes.md#decisão-52--foto-oficial-do-anúncio-mesmo-quando-a-origem-veio-só-com-texto));
a rota **TCG Promo** publica. **Ainda em observação:** o teto de 40 posts/hora sob volume
alto de várias origens ao mesmo tempo.

**Risco aceito e registrado:** o número de WhatsApp pode ser banido, porque ler grupo exige
biblioteca não oficial. Use chip separado.

---

## 14/08 — teste de fim de semana (~18h43 BRT)

O bot **não estava parado**. Scanner e Publisher ativos, versões publicadas, zero erro.
O canal ficou mudo o dia inteiro porque as ofertas da vitrine **já estavam `posted`**:
um `item_id` só entra na fila uma vez, salvo queda de preço (Decisão 33). Às 18:20 o
Scanner marcou 7 `aceito` (15–33% OFF) e o `INSERT ON CONFLICT DO NOTHING` não
reenfileirou nenhum.

Para o teste de fim de semana, os 7 voltaram a `pending` (zerando `posted_at` e
`telegram_message_id`). Primeiro post: Box Mega Zygarde ex, 18:26 BRT, `message_id` 31,
link de afiliado ok. **Não republicar esses 7 de novo.**

Na mesma tarde:

| O quê | Onde | Versão / dado |
| --- | --- | --- |
| Filtro: cartas/acessório TCG + figura Pokémon | `lojas_confiaveis.filtro_titulo` | [Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova). Escala Miniaturas **sem** `\bcartas\b`. Funko continua fora |
| Teto horário 4 → **6**/hora | Publisher `Under Hourly Limit?` | [Decisão 38](historico-de-decisoes.md#decisão-38--teto-horário-de-6-posts), publicado `57c2826e` |

A varredura das ~18:40 aceitou *Makuhita 19 Cards* (loja oficial, 28% OFF). Sleeve ainda
não apareceu nas 9 homepages.

---

## 16/08 — o canal não quebrou; a homepage só tinha o já postado

Conferido ~21h30 BRT. VPS ligada. Scanner, Publisher e Health Alert ativos, publicados,
**zero erro** no fim de semana. Health das 21h: `tem_problema = false`, `pending = 0`.

Último post: **16/08 08:00**, `message_id` 42, Box Display 216 Cartas Caos Ascendente
(R$ 377,80). A varredura das 21h25 aceitou de novo 8 ofertas (Zygarde, Greninja, Lucario,
blister, booster, coleção, ETB…) — todas já `posted`. Sem a Decisão 40 o canal ficaria
mudo até aparecer `item_id` novo na homepage.

A reoferta de 3 dias **não** dispara neste domingo (os posts de sexta/domingo ainda não
fizeram 72h). A partir de **terça ~18h** os de sexta podem voltar à fila se ainda
estiverem em oferta.

---

## 16/08 noite — figuras no filtro, zero loja nova (Decisão 41)

Pedido do Eduardo: mais lojas oficiais + boneco/figura, sem merch. O que entrou no ar:

1. **`filtro_titulo` nas 9 lojas** — boneco/figura/nendoroid no positivo; Funko, pelúcia,
   lote e `sem repetid` na exclusão. Testado em Node antes do `UPDATE`.
2. **Nenhuma loja nova.** ~40 slugs reabertos; Ri Happy/PBKids/Bandai sem `/loja/`;
   Nintendo é jogo; Funko tem Pokémon e **não** entra. A Decisão 29 já tinha esgotado
   homepage oficial com TCG lacrado.
3. **Scanner manual `20231`:** boxes TCG passam (`sem_oferta` quando sem desconto);
   Funko Slowpoke/Glaceon `fora_do_filtro`; nenhuma figura Pokémon não-Funko nas 9
   homepages nesta rodada. Os 7/8 do teste de 14/08 **não** foram reenfileirados.

Próximo volume, se ainda faltar: o Catalog Scanner já existe e **fica inativo**
([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).
Não `INSERT` cego de rede e não `ultra_premium` sem pedido novo.

---

## Conferência da varredura ~22h10 BRT (execução `15057`)

Última execução agendada lida no n8n nesta atualização da documentação. Status `success`.
As 9 lojas ativas tiveram `Atualizar Estado da Loja`. Amostra truncada do parser (50
itens: pokemon + copag + brinkjr) mostra o funil típico da noite:

| Loja | O que o parser viu nesta amostra | Destino |
| --- | --- | --- |
| `pokemon` | *Dragapult Ex League Battle Deck* | `sem_oferta` (preço cheio, sem “de/por”) |
| `copag` | 35 títulos fora do filtro (Truco, Harry Potter, Bicycle…) + 1 Pokémon | o box *Mega Luar Mega Gengar Ex* descartado: **2,14%** < mínimo 5% |
| `brinkjr` | 13 brinquedos (Lego, Funko K-pop, laptop Barbie…) | todos `fora_do_filtro` |

`Log Aceito Loja` nesta execução: **0**. O Publisher, já depois das 22h, só passava em
`Outside Posting Window` (~10 ms). Isso **não** é pane.

---

## Por que o canal parou depois das 17h40

A pergunta do Eduardo, respondida com o funil da varredura das 18h10:

| Loja | Na vitrine | Passou no filtro de título | Em oferta | Aceitos | Situação dos aceitos |
| --- | --- | --- | --- | --- | --- |
| `pokemon` | 3 | 3 | 2 | 1 | já publicado |
| `copag` | 39 | 4 | 4 | 2 | já publicados |

O Publisher está saudável: dispara no relógio, entra na janela de horário, passa no teto
diário e o `Fetch Next Pending` volta **vazio** quando não há oferta nova. (Às 18h10 o
relógio ainda era 5 min e o teto ainda era citado como 30 em alguns textos — os valores
vigentos da noite são **2 min** e teto **40**.)

Três fatos que fecham o diagnóstico:

- Os 2 produtos Pokémon que sobraram na COPAG estão com **2,14%** e **5%** de desconto, contra
  o mínimo de 15% da loja. Nem baixando o mínimo para 10% eles entrariam.
- A vitrine da loja oficial Pokémon tem **3 produtos**, conferido ao vivo em 13/08. A URL
  `/loja/pokemon/produtos` devolve exatamente a mesma página, sem paginação — não é o parser
  perdendo produto.
- Os 35 barrados da COPAG são baralhos comuns (Truco, Harry Potter, Bicycle, Turma da Mônica).
  O filtro está fazendo o trabalho certo.

**Conclusão:** o canal volta a postar sozinho quando alguma das duas lojas baixar preço ou
incluir produto novo. Para aumentar o volume é preciso mexer no escopo, e isso é decisão do
Eduardo — as opções estão no [README](../README.md#o-que-depende-de-uma-decisão-do-eduardo).

---

## O religamento de 13/08/2026, passo a passo do que foi feito

1. **Diagnóstico:** das 13 linhas de `promos`, **todas as 13** ainda tinham o link no formato
   antigo (`matt_word=MLB`) — 4 `pending`, 4 `review`, 3 `blocked`, 2 `descartado`.
2. **`UPDATE` do P16:** regravou o `utm_link` dos **4 itens `pending`**. A conferência depois
   mostrou 4 no formato novo e **zero** no antigo.
3. **Publisher ativado** e executado uma vez na mão: publicou o `MLB6072858336`
   ("Boneco Funko Pop! Pokémon - Slowpoke", de R$ 149,99 por R$ 88,90, 41% OFF) com o botão
   apontando para
   `https://www.mercadolivre.com.br/boneco-funko-pop-pokemon-slowpoke/p/MLB55880155?matt_word=caed1312314&matt_tool=96097202&forceInApp=true`.
4. **Saúde conferida:** 12 execuções seguidas do Scanner com sucesso; `promos_erros` tem
   **uma única linha em toda a história da tabela**, de 05h11 BRT — uma varredura em que a
   vitrine da loja `pokemon` voltou com zero produtos (HTTP 200). Não se repetiu.
5. **Trava de afiliado (17h40), a pedido do Eduardo:** o fallback para `permalink` saiu do
   `Format PT-BR Message`, o `Fetch Next Pending` passou a exigir os parâmetros de afiliado
   no `WHERE`, e entraram três nodes novos — `Pode Publicar?` (IF),
   `Log Nao Publicavel` e `Registrar Pendentes Impublicaveis`. Execução de teste depois da
   mudança: post do `MLB4718918333` (`message_id` 18) com o link de afiliado no botão.
6. **Fechamento do dia:** 4 posts publicados, **4 com link de afiliado** (nenhum sem), fila
   `pending` zerada, zero linhas com `error_step = 'afiliado'`.
7. **Filtro de título apertado (18h00):** as duas lojas passaram a exigir produto de TCG
   ([Decisão 25](historico-de-decisoes.md#decisão-25--o-filtro-passa-a-exigir-produto-de-tcg-e-o-funko-fica-no-canal)).
   A loja oficial estava **sem filtro nenhum** — era essa a causa do Funko, não um filtro
   frouxo. O post do Funko **fica no canal**, por decisão do Eduardo.
8. **Achado no meio do caminho:** o Store Scanner rodava com a **versão publicada antiga** e
   ainda gerava o link de afiliado no formato errado, apesar de o código salvo estar
   corrigido. Foi publicado; a varredura seguinte já saiu com
   `matt_word=caed1312314&matt_tool=96097202`. No n8n, **salvar não é publicar**.
9. **Auditoria de versões (18h10),** motivada pelo item 8: os quatro workflows foram
   conferidos comparando `versionId` com `activeVersionId`. Os dois que ficam ativos —
   Publisher e Store Scanner — estão em produção com a versão atual, e a trava de afiliado
   foi confirmada **dentro da versão publicada** do Publisher, node por node, não só pelo ID.
   Os dois inativos nunca foram publicados, o que é inofensivo enquanto não forem ligados.
   A conferência virou passo obrigatório do runbook e o
   [P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada).
10. **Os 4 posts do dia foram reauditados um a um** nas execuções: todos com
    `matt_word=caed1312314&matt_tool=96097202&forceInApp=true` no botão do Telegram. Os dois
    primeiros (`message_id` 16 e 17) saíram **antes** de a trava ser publicada e escaparam
    por terem o `utm_link` já regravado no banco — deu certo por causa da camada do banco,
    não da camada do código. É a melhor ilustração de por que a proteção é em camadas.
11. **Trava de foto (18h25):** a metade que faltava do
    [P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha).
    O `Fetch Next Pending` passou a exigir `thumbnail LIKE 'http%'` e o `Format PT-BR Message`
    ganhou a checagem correspondente. O IF virou `Pode Publicar?` e os logs perderam o
    "Sem Afiliado" do nome, porque guardam duas travas agora
    ([Decisão 26](historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila)).
    A lógica foi testada em JavaScript contra 5 casos antes de subir, e o workflow rodou na mão
    depois de publicado, sem erro.
12. **Fila de revisão zerada:** os 4 itens em `review` vinham todos de `search_term`
    `ofertas MLB6899`, a busca geral que saiu de escopo, e todos tinham autenticidade duvidosa
    (vendedores com 0 vendas ou sem reputação). Foram marcados como `descartado`, com o motivo
    e o caminho de volta gravados no `blocked_reason`.
13. **Backup dos workflows no repositório:** [`backups/2026-08-13/`](../backups/), com os 4
    JSONs, os 3 Code nodes em `.js` e as 37 consultas em `.sql`. O projeto já perdeu workflows
    num redeploy uma vez ([P6](troubleshooting.md#p6--os-workflows-desapareceram-do-n8n)).
14. **Limpeza:** o `TMP Pokemon SQL Console` foi arquivado e a pasta de rascunho do agente foi
    apagada.

### O que ficou deliberadamente de fora

- **O clique de afiliado já foi atribuído** (5 cliques em 13/08, conta do Eduardo). **Venda
  e comissão ainda não.** A URL está correta.
- **O escopo das lojas não foi ampliado de novo no Pacote A.** O que mudou foi o corte de
  qualidade (10%/15%) e o ritmo do canal (6/hora). Cadastrar loja nova continua sendo
  decisão do Eduardo. Religar o Scanner v2 **já foi feito** em 25/08
  ([Decisão 43](historico-de-decisoes.md#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora)).
- **Nenhuma mensagem do canal foi apagada,** inclusive a do Funko.

---

## Link de afiliado — resolvido

**Formato em produção desde 13/08/2026:**

```
{permalink sem parâmetros}?matt_word=caed1312314&matt_tool=96097202&forceInApp=true
```

O formato antigo (`?matt_tool=caed1312314&matt_word=MLB&matt_source=social`) tinha o apelido
da conta e o ID da etiqueta **trocados de lugar**. A conferência contra dois links reais do
painel do Eduardo confirmou. A montagem foi isolada na função `montarLinkAfiliado`, igual nos
dois scanners, justamente para que ajustar isso de novo seja trivial.

Registro completo: [Decisão 23](historico-de-decisoes.md#decisão-23--o-formato-do-link-de-afiliado-confirmado-e-corrigido)
e [troubleshooting P16](troubleshooting.md#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos).

**E agora existe uma trava.** Não basta o formato estar certo no código: o Publisher
**recusa** publicar item cujo `utm_link` não contenha `matt_word=caed1312314` e
`matt_tool=96097202`. O fallback que publicava com o link cru foi removido. Item barrado
fica em `pending` e aparece em `promos_erros` com `error_step = 'afiliado'` — nunca some
calado. Ver [Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado)
e [regras de negócio, seção 10](regras-de-negocio.md#10-link-de-afiliado).

---

## Listagem completa da loja via ScraperAPI — construído, parado na renderização

**16/08 ~23h10:** o workflow existe e **fica inativo**. Ver
[Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo).
Não repetir os testes desta noite sem ler essa decisão.

O que segue abaixo foi **medido em 13/08**. Na noite de 16/08 a **página 1 também falhou**
(HTTP 500 com `render=true` e com `premium=true`, ~56 s, sem cobrança). O parser do Catalog
Scanner **nunca viu HTML** nesta sessão.

### 1. A linha de base é pior do que se imaginava: 3 produtos

A vitrine (`https://www.mercadolivre.com.br/loja/pokemon`), que é o que o
`Pokemon Store Scanner` varre hoje, foi parseada e devolveu **3 produtos, sendo 2 em oferta**.
A listagem completa tem **113 produtos**. O bot enxerga hoje cerca de **2,7%** do catálogo.

### 2. A listagem completa exige navegador de verdade — não é bloqueio de IP

`https://lista.mercadolivre.com.br/loja/pokemon/` foi testada **a partir de um IP residencial**
(a máquina do Eduardo) com `User-Agent` de Chrome e cabeçalhos completos: devolveu **HTTP 200
com a página de `suspicious-traffic`**, igual à VPS.

Isso corrige um diagnóstico anterior: **o problema não é o endereço da VPS**. O Mercado Livre
serve um desafio JavaScript (`/v3/security.js`) nessa rota, e qualquer cliente que não execute
JavaScript é barrado, venha de onde vier. Por isso `render=true` (renderização de JavaScript)
é **obrigatório** no ScraperAPI — não é opcional como se supunha.

Em 5 tentativas diretas ao longo da noite, 1 passou e 4 foram bloqueadas: a rota é instável
mesmo sem proxy, o que reforça que não dá para depender dela de graça.

### 3. A receita que funcionou em 13/08 (e falhou em 16/08)

```
http://api.scraperapi.com/?api_key=<CHAVE>&url=<url_encodada>&render=true&country_code=br
```

Resultado real na página 1 da loja Pokémon:

| Métrica | Valor |
| --- | --- |
| HTTP | 200 |
| Tamanho | 1.391.102 bytes |
| Tempo | 50,5 s |
| Página de bloqueio? | não |
| Produtos na página | 48 |
| Ofertas (preço de/por) | 18 |
| Total declarado pelo site | **113 resultados** |
| Páginas | 3 |

### 4. O formato do HTML é DIFERENTE do da vitrine

Esta é a parte que mais economiza tempo na retomada.

| | Vitrine (`/loja/pokemon`) | Listagem (`lista.../loja/pokemon/`) |
| --- | --- | --- |
| Marcador | `_n.ctx.s.q("...")` | `_n.ctx.r={...}` |
| Formato | string comprimida com `@` e tokens | **JSON puro** |
| Onde estão os produtos | array `polycards` espalhado | `appProps.pageProps.initialState.results[].polycard` |

Ou seja, **`extrairPayloadLoja` não serve** para a listagem — é preciso uma função nova que
leia `_n.ctx.r=` e faça varredura de chaves balanceadas até o `}` correspondente. Essa função
já foi escrita e validada localmente (ver "artefatos", abaixo).

**A boa notícia:** de `results[].polycard` para baixo a estrutura é **idêntica** à da vitrine.
As funções `mapearCard`, `detectarIdioma`, `precoOriginalDoCard`, `montarThumb` e
`assinaturaTitulo` do `Pokemon Store Scanner` podem ser reaproveitadas **sem alteração**.

Campos confirmados em cada card: `metadata.id`, `metadata.product_id`, `metadata.url`,
`metadata.url_params`, `metadata.category_id` (= `MLB6899`), componentes `title`, `seller`
(traz o nome da loja e o selo "Loja oficial"), `review_compacted` (nota do vendedor),
`price` e `shipping_v2`. O `polycard_context.picture_template` também está presente.

Detalhe de preço: nesta página o preço "de" **não** vem em `previous_price`; vem em
`price_labels[].values[].price` com `previous: true`. A função `precoOriginalDoCard` que já
existe **já trata esse caso** — foi conferido.

### 5. Paginação: 3 páginas, de 48 em 48 (não 50)

O próprio payload entrega as URLs em `pagination.pagination_nodes_url`:

- Página 1: `https://lista.mercadolivre.com.br/loja/pokemon/_NoIndex_True`
- Página 2: `https://lista.mercadolivre.com.br/loja/pokemon/_Desde_49_NoIndex_True`
- Página 3: `https://lista.mercadolivre.com.br/loja/pokemon/_Desde_97_NoIndex_True`

E `pagination.results_limit` traz o total (113) e `page_count` traz o número de páginas — dá
para descobrir a paginação na própria página 1, sem chutar.

**Pendência real (atualizada em 16/08):** as páginas 2 e 3 já falhavam em 13/08. Na noite
de 16/08 a **página 1 também** devolve HTTP 500 (~56 s, mesmo `etag`, com `render` e com
`premium`). O primeiro teste da retomada **não** é paginação: é a página 1 voltar a 200
com `_n.ctx.r` numa execução **manual** só de `pokemon`. `ultra_premium` só com pedido novo.

### 6. Um caminho gratuito foi testado e descartado

`https://www.mercadolivre.com.br/ofertas?official_store=236642` parecia perfeito: está no
domínio `www`, que nunca teve anti-bot, e responde 200 de graça.

**Mas o filtro `official_store` é simplesmente ignorado.** O parser rodou nas páginas 1 e 2 e
devolveu jogo de panelas, Smart TV Philips, power bank e cadeira de escritório — a página
geral de ofertas, sem relação com a loja Pokémon. Caminho **descartado**, não vale retentar.

---

## Consumo do ScraperAPI

**16/08 à noite:** execuções `20301`–`20336` (404 de auth, depois 500 de domínio protegido)
**não cobraram**. `premium=true` também não passou. Ver [Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo).

**Requisições de 13/08: 7 confirmadas** (mais até 3 de resultado desconhecido, de um comando
interrompido no meio).

| Chamada | Resultado | Créditos |
| --- | --- | --- |
| 3× listagem sem `render` | HTTP 500 (falha) | 0 |
| 1× `httpbin.org/ip` (validar a chave) | HTTP 200 | 1 |
| 1× listagem página 1 com `render=true&country_code=br` | HTTP 200 | **10** |
| 2× páginas 2 e 3 com `render=true` | HTTP 500 (falha) | 0 |
| até 3× teste de paginação (comando interrompido) | desconhecido | 0 a 30 |

**Créditos consumidos, confirmados: 11** (o painel foi de 5.000 para 4.989).
Falhas **não são cobradas** — isso foi verificado na prática.

### O multiplicador de custo: sim, existe, e é 10x

| Modo | Custo por requisição |
| --- | --- |
| Requisição padrão | **1 crédito** |
| Com `render=true` | **10 créditos** |
| Com `premium=true` + `render=true` | **25 créditos** (16/08: mesmo 500, sem cobrança) |
| Com `ultra_premium=true` + `render=true` | **75 créditos** — plano pago; **não ligar** sem pedido novo |

Como `render=true` é **obrigatório** aqui (item 2 acima), **cada página da listagem custa 10
créditos** no modo que passou em 13/08. `premium+render` custa 25 e **também falhou** em
16/08. Uma varredura completa das 3 páginas, se um dia voltar a 200, custaria **30** (render)
ou **75** (premium) — e 10 lojas/dia com premium estoura o trial.

### Cota: trial de 5.000 (confirmado 13/08)

O endpoint `/account` do ScraperAPI reportou `requestLimit: 5000`. A conta nasceu em
13/08/2026. Com o Catalog Scanner **inativo**, a frequência não entra em jogo. Se a listagem
voltar, o default continua **1×/dia só de `pokemon`**. O plano antigo de “a cada 3 horas”
(8×/dia) **não cabe** nem nos 5.000.

---

## Onde a chave do ScraperAPI está guardada

**A chave não está em nenhum arquivo deste repositório e não deve estar.**

**Está no n8n desde 16/08**, credencial Query Auth (nome na lista: **Query Auth account**,
id `1bhdvX6LLEbuo97b`). O campo **Name** da aba Connection tem que ser `api_key`. Sem isso
a API devolve 404. O valor fica criptografado no n8n e some dos logs de execução.

---

## Credencial Query Auth — já criada à mão (16/08)

O MCP do n8n **não cria** credencial com valor. O Eduardo criou pela interface. O Catalog
Scanner já aponta para ela.

Armadilha: o **título** da credencial na lista pode ser qualquer um (hoje está
**Query Auth account**). O que a API exige é o campo **Name** = `api_key`. Se estiver
errado, a chamada devolve 404 em ~1,6 s e **não** cobra.

`$env` **não funciona** nesta instalação
([troubleshooting P10](troubleshooting.md#p10--access-to-env-vars-denied)). Não coloque a
chave no Code node, no banco nem em Data Table — ela vaza no histórico de execuções.

---

## O que falta, na ordem

**Curto prazo — religar o canal:**

1. ~~Regravar o `utm_link` dos itens `pending`.~~ **Feito em 13/08.**
2. ~~Ativar o `Pokemon Publisher v2` e conferir um post real.~~ **Feito em 13/08.**
3. ~~**Confirmar a atribuição do clique no painel de afiliados.**~~ **Feito em 13/08:** 5
   cliques registrados (conta do Eduardo). **Venda/comissão ainda não.**

**Médio prazo — o catálogo completo (113 produtos em vez de 3):**

4. ~~**Confirmar a cota real do ScraperAPI.**~~ Trial de **5.000** créditos (conta 13/08).
   10 lojas/dia com `premium+render` (25) = ~7.500/mês — **estoura** o trial.
5. ~~**Decidir a frequência.**~~ Decisão 42: **não varre** enquanto a listagem falhar.
   Quando voltar, o default continua 1×/dia só de `pokemon`.
6. **Resolver o HTTP 500 da listagem.** Em 16/08 a página 1 falha com `render` e com
   `premium`. `ultra_premium` (75 créditos, plano pago) **só com pedido novo**.
7. ~~**Eduardo cria a credencial Query Auth.**~~ Feito 16/08. Name = `api_key`.
8. ~~**Construir o `Pokemon Catalog Scanner`.**~~ Existe (`2ckVyvFPvtqwECDI`), **inativo**,
   **não publicar**. Parser em `backups/2026-08-16/code-nodes/`.
9. **Testar rodando na mão** só de `pokemon` (`TESTE_SO_POKEMON = true`) **quando** a
   listagem voltar a 200. O parser ainda não viu HTML desta sessão.
10. **COPAG / outras lojas no catálogo:** só depois que `pokemon` sozinha passar no teste
    manual. Node `Filtrar Loja de Teste` segura as outras.

**Limpeza: parcial em 13/08/2026.** O console `PVNsBGQ92Wrhos51` foi arquivado. Nasceu o
`TMP Pokemon SQL Console 2` (`Fc7OGlP4ZNiuNIgd`) para inspecionar `lojas_confiaveis` e a
fila — descartável, pode arquivar. A pasta `.tmp-agente/` no repositório é rascunho de
agente (scripts de busca de loja); **não é fonte de verdade**. O que importa está no n8n
e em [`backups/`](../backups/).

---

## Artefatos

### No repositório: `backups/2026-08-13/`

A pasta de rascunho `.tmp-agente/` **pode existir de novo** depois de uma sessão de agente
(scripts de busca de loja). Não execute nada dali como se fosse produção. O que era valioso
do parsing virou backup datado em [`backups/`](../backups/).

Continua valendo a regra do projeto: **o n8n é a fonte de verdade**. O backup é rede de
segurança, não fonte — os workflows já sumiram uma vez num redeploy
([P6](troubleshooting.md#p6--os-workflows-desapareceram-do-n8n)).

### Fora do repositório: `%TEMP%`

| Arquivo | Para que serve |
| --- | --- |
| `sa_render_br.html` | **A captura da página 1 da listagem** (1,4 MB). Custou 10 créditos. Serve para desenvolver e testar o parser **sem gastar crédito nenhum** |
| `f_ofertas_loja_p1.html`, `f_ofertas_loja_p2.html` | Provas de que o filtro `official_store` é ignorado |
| `dir_*.html` | Capturas da vitrine e das páginas de bloqueio |

Se o Windows limpar o `%TEMP%` no reinício, só o `sa_render_br.html` faz falta — e recuperá-lo
custa 10 créditos.
