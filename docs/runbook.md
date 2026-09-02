# Runbook de operação

O manual do dia a dia. Cada seção é uma tarefa concreta, com o passo a passo e o SQL
pronto para copiar e colar.

**Convenção usada aqui:** as consultas marcadas com 🟢 são **só leitura** — não mudam nada,
pode rodar sem medo. As marcadas com 🟡 **alteram dados**; leia antes de rodar.

**Índice**

1. [Ligar e desligar o bot](#1-ligar-e-desligar-o-bot)
2. [Como rodar uma consulta SQL](#2-como-rodar-uma-consulta-sql)
3. [Cadastrar um cupom](#3-cadastrar-um-cupom)
4. [Revisar a fila de revisão humana](#4-revisar-a-fila-de-revisão-humana)
5. [Conferir o que foi postado](#5-conferir-o-que-foi-postado)
6. [Conferir se o parser quebrou](#6-conferir-se-o-parser-quebrou)
7. [Calibrar os filtros olhando os dados](#7-calibrar-os-filtros-olhando-os-dados)
8. [Rodar um workflow manualmente, sem ativar](#8-rodar-um-workflow-manualmente-sem-ativar)
9. [Liberar um produto para ser reavaliado](#9-liberar-um-produto-para-ser-reavaliado)
10. [Conferir o schema real do banco](#10-conferir-o-schema-real-do-banco)
11. [Rotina sugerida](#11-rotina-sugerida)
12. [Lista de bloqueio de vendedores](#12-lista-de-bloqueio-de-vendedores)
13. [Escopo: quais lojas o bot pode publicar](#13-escopo-quais-lojas-o-bot-pode-publicar)
14. [Alerta privado de saúde do bot](#14-alerta-privado-de-saúde-do-bot)
15. [A esteira de réplica de WhatsApp](#15-a-esteira-de-réplica-de-whatsapp)

---

## 1. Ligar e desligar o bot

> **Estado em 25/08/2026, ~22h15 BRT: Store Scanner, Scanner v2, Publisher e Health Alert estão ativos.**
> Store Scanner a cada **5 min**, Scanner v2 a cada **10 min**, Publisher a cada **2 min**
> (8h–22h BRT, teto **90**/dia e **6**/hora).
> Mínimo **10%** em `pokemon`/`copag`, **15%** nas outras lojas e na busca geral. Filtro nas lojas: cartas/acessório TCG +
> figura Pokémon (Decisão 41). Busca geral exige Pokémon no título ([Decisão 43](historico-de-decisoes.md#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora)).
> O **Pokemon Catalog Scanner** (`2ckVyvFPvtqwECDI`) existe e
> **fica inativo** — não publique, não ligue `ultra_premium` ([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).
> O passo a passo abaixo continua valendo para quando você quiser desligar ou religar.

### Antes de religar depois de uma mudança

Faça esta sequência sempre que tiver mexido em Code node, em link de afiliado ou no schema.

1. **Rode o Scanner na mão** ([seção 8](#8-rodar-um-workflow-manualmente-sem-ativar)) e
   confira que ele terminou sem erro. Se algum node ficar vermelho com mensagem de
   credencial, é o problema conhecido dos nodes novos sem credencial vinculada — abra o node,
   escolha a credencial "Pokemon Promos DB" e salve.
2. **Confira a fila** com a consulta da [seção 5](#5-conferir-o-que-foi-postado) e veja se
   entrou algo com `status = 'pending'`.
3. **Rode o Publisher na mão** e confira se o post saiu bonito no canal.
4. **Publique a versão** — veja o passo abaixo. Rodar na mão usa a versão salva; o
   agendamento usa a publicada. Pular isso é deixar o bot no ar com o código velho.
5. **Só então ative os dois.**

### Salvar não é publicar 🔴

**Passo obrigatório toda vez que você mexer num workflow que fica ativo.** No n8n, a versão
que você salvou e a versão que está rodando em produção são coisas diferentes. Salvar não
coloca a mudança no ar; quem faz isso é o botão **Publish**.

Em 13/08/2026 o `Pokemon Store Scanner` passou horas gerando link de afiliado no formato
errado por causa disso: a correção estava salva, mas não publicada
([troubleshooting, P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

Como conferir, em ordem de confiança:

1. **Na interface:** depois de salvar, o botão **Publish** continua disponível. Clique nele.
   Quando não há nada pendente, ele não oferece mais nada a publicar.
2. **Pelo dado:** os campos `versionId` e `activeVersionId` do workflow precisam ser iguais.
   Diferentes significa produção atrasada; `activeVersionId` nulo significa nunca publicado.
3. **Pela execução, que é a prova real:** abra a primeira execução **agendada** depois da
   mudança (não a manual) e veja se o node novo aparece no caminho percorrido. Node que não
   existe na versão publicada simplesmente não aparece.

### Ligar

1. Abra <https://srv1897392.hstgr.cloud>
2. Abra o workflow **Pokemon Store Scanner** (`PNwaF3BYhj5KA8eY`) — lojas oficiais.
   O `Pokemon Scanner v2` (`39kdRchYI6CwsbNY`) é a busca geral e **também** deve ficar ativo
   ([Decisão 43](historico-de-decisoes.md#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora))
3. No canto superior direito, clique no botão **Active** (em algumas versões do n8n aparece
   como **Publish**). Ele fica verde ou marcado
4. Repita para o **Pokemon Scanner v2** e para o **Pokemon Publisher v2** (`FXNWeT9C7dEA0DUY`)
5. O **Pokemon Health Alert** (`3irgeWFKZGZZrJ5u`) também deve ficar ativo — alerta privado,
   não publica no canal

**Não ligue o Pokemon Catalog Scanner** (`2ckVyvFPvtqwECDI`). Ele existe, fica inativo e
**não se publica** enquanto `lista.mercadolivre.com.br` devolver HTTP 500 no ScraperAPI
([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).
O Scanner v2 (`39kdRchYI6CwsbNY`) está **ativo** desde a Decisão 43 (busca geral + Pokémon no título).

Pronto, o bot está no ar. A partir daí:

- O Scanner varre as vitrines das lojas a cada **5 minutos**, com uma espera aleatória de até 60
  segundos antes de acessar o site (por isso o intervalo real varia de ~4 a ~6 minutos).
  **Não baixe para 2 minutos:** são 10 lojas HTTP por ciclo.
- O Publisher publica 1 promoção a cada **2 minutos**, na ordem de qualidade (Pokémon →
  COPAG → economia em R$ → %), dentro da janela de 8h às 22h BRT, até o teto de 40 posts
  por dia e 6 na última hora corrida

**Ordem recomendada:** ligue o Publisher primeiro só se você já conferiu a fila. Se houver
itens antigos na fila que você não quer publicar, resolva isso antes
([seção 4](#4-revisar-a-fila-de-revisão-humana) e [seção 9](#9-liberar-um-produto-para-ser-reavaliado)).

### Desligar

Mesmo caminho, clicando no botão para desativar. Desligar é seguro e não perde nada: a fila
fica parada no banco esperando.

**Desligar só o Publisher** é a forma de "pausar o canal" continuando a acumular promoções.
**Desligar só o Scanner** é a forma de esvaziar a fila atual e parar de captar novas.
O **Health Alert** é independente: desligar o bot não desliga o aviso, e desligar o aviso
não pausa o canal. Veja a [seção 14](#14-alerta-privado-de-saúde-do-bot).

### Parada de emergência

Se algo estiver saindo errado no canal, desative o **Publisher** primeiro. É ele que fala
com o público. O Scanner só escreve no banco e não faz barulho.

---

## 2. Como rodar uma consulta SQL

Você não precisa instalar nada nem saber programar. O jeito de consultar o banco é criar um
workflow descartável de dois nodes dentro do próprio n8n — um "console de SQL".

**Como montar o console (leva um minuto):**

1. Abra <https://srv1897392.hstgr.cloud> e clique em **Add workflow**
2. Adicione um node **Manual Trigger** (o gatilho de "executar quando eu clicar")
3. Adicione um node **Postgres**, com **Operation** = **Execute Query**
4. No campo de credencial do node, escolha **"Pokemon Promos DB"**
5. Ligue a saída do trigger na entrada do Postgres
6. Cole a consulta no campo **Query**
7. Clique em **Execute workflow** e depois no node do Postgres para ver o resultado

Dê um nome que avise que é descartável, começando por `TMP` — por exemplo
`TMP SQL Console`. Assim ninguém confunde com os workflows do bot. Ao longo do projeto
existiu um `TMP Pokemon SQL Console 3`, que foi arquivado; se você encontrar algum console
`TMP` já pronto no n8n, pode reaproveitar em vez de montar outro.

**Três avisos:**

- Esse console executa **qualquer** comando, inclusive `DELETE` e `DROP TABLE`. Cole só o
  que você entendeu.
- **Não salve** o console com uma consulta que altera dados. Se alguém executar sem olhar,
  ela roda de novo.
- Se a consulta tiver `{{` ou `}}`, o n8n tenta interpretar como expressão. Nenhuma consulta
  deste runbook tem isso, então não é problema aqui.

---

## 3. Cadastrar um cupom

**Caminho normal (14/08 em diante):** teste o código no Mercado Livre, depois mande neste
chat: código, o que ele faz, mínimo, validade e **os links/MLB que aceitaram**. O agente
grava em `cupons` + `cupons_itens`. Sem produto na lista, o post sai **sem** cupom.

Modelo da mensagem:

- Código `BRINQUEDOS`
- 15% OFF, mínimo R$ 59, até 16/08/2026 23h59
- Liberado em: `MLB4836905147` e este link `https://www.mercadolivre.com.br/...`

Para desligar: “desliga o BRINQUEDOS”. Para incluir outro: “libera também este link”.

SQL direto ainda funciona, mas **um INSERT só em `cupons` não cola em ninguém** — falta
a linha em `cupons_itens`.

### Cadastrar 🟡

```sql
INSERT INTO cupons (codigo, descricao, valor_minimo_cents, valido_ate, prioridade, observacao)
VALUES (
    'MELI10',
    '10% OFF em Cartas Colecionáveis',
    7900,
    '2026-08-20 23:59:00-03',
    100,
    'campanha de agosto, veio pelo canal de afiliados'
);

INSERT INTO cupons_itens (cupom_id, item_id, catalog_id)
SELECT id, 'MLB4836905147', 'MLB74460211'
FROM cupons WHERE codigo = 'MELI10';
```

**Cuidados ao preencher:**

| Campo | Cuidado |
| --- | --- |
| `codigo` | Se o cupom for automático no checkout (sem código para digitar), use `NULL` |
| `descricao` | É o texto exato que vai aparecer no post. Escreva pensando no assinante lendo |
| `valor_minimo_cents` | **Em centavos.** R$ 79,00 é `7900`, não `79`. Use `NULL` se não houver mínimo |
| `valido_ate` | Sempre com o `-03` no fim, que é o fuso de Brasília. Sem isso o banco assume UTC e o cupom expira 3 horas antes do que você quer |
| `prioridade` | Só importa se houver mais de um cupom válido ao mesmo tempo |

**Não use cupom “para todos”.** O JOIN exige `cupons_itens` (anúncio `wid` ou catálogo
`/p/` `/up/` no permalink) **e** preço >= mínimo. `categoria_id` NULL sozinho **não**
cola mais — foi o furo do `BRINQUEDOS` no blister (Decisão 36).

### Desligar um cupom 🟡

Nunca apague — desligue. Assim você mantém o histórico.

```sql
UPDATE cupons SET ativo = FALSE WHERE codigo = 'MELI10';
```

### Ver os cupons cadastrados 🟢

```sql
SELECT id,
       codigo,
       descricao,
       valor_minimo_cents / 100.0 AS minimo_reais,
       ativo,
       prioridade,
       to_char(valido_ate AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS vence_em,
       CASE
           WHEN ativo = FALSE                THEN 'desligado'
           WHEN valido_ate < now()           THEN 'vencido'
           WHEN valido_de  > now()            THEN 'ainda não começou'
           ELSE                                   'VALENDO AGORA'
       END AS situacao
FROM cupons
ORDER BY ativo DESC, prioridade DESC;
```

### Ver exatamente qual cupom entraria no próximo post 🟢

É a mesma lógica que o Publisher usa, isolada para você conferir:

```sql
SELECT codigo, descricao, prioridade,
       to_char(valido_ate AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS vence_em
FROM cupons
WHERE ativo = TRUE
  AND (valido_de  IS NULL OR valido_de  <= now())
  AND (valido_ate IS NULL OR valido_ate >= now())
  AND (categoria_id IS NULL OR categoria_id = 'MLB6899')
ORDER BY prioridade DESC, valido_ate ASC NULLS LAST
LIMIT 1;
```

Se voltar vazio, os posts sairão sem linha de cupom — que é o comportamento normal e
correto. **Cupom vencido nunca vai ao ar**, porque o filtro de data está na própria
consulta do bot.

---

## 4. Revisar a fila de revisão humana

Produtos com autenticidade duvidosa (score entre −40 e +25) não vão ao canal: ficam
esperando sua decisão. Vale olhar essa fila a cada dois ou três dias no começo, tanto para
não perder promoção boa como para calibrar o filtro.

### Ver a fila 🟢

```sql
SELECT r.id,
       r.item_id,
       left(r.title, 80)             AS titulo,
       r.price_cents / 100.0         AS preco_reais,
       r.discount_pct                AS desconto,
       r.motivo,
       p.permalink,
       to_char(r.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS entrou_em
FROM promos_review r
LEFT JOIN promos p ON p.item_id = r.item_id
WHERE r.status = 'pending'
ORDER BY r.discount_pct DESC;
```

O campo `motivo` traz o score e a lista de sinais a favor e contra. Abra o `permalink` e
olhe o anúncio: foto, descrição, vendedor. Em geral dá para decidir em poucos segundos.

### Aprovar um item (ele entra na fila de publicação) 🟡

Troque `MLB1234567890` pelo `item_id` real. São dois comandos, porque o item vive em duas
tabelas:

```sql
UPDATE promos        SET status = 'pending'  WHERE item_id = 'MLB1234567890';
UPDATE promos_review SET status = 'approved' WHERE item_id = 'MLB1234567890';
```

Depois disso o item entra na fila e será publicado na próxima rodada do Publisher, na
posição que o desconto dele merecer.

### Rejeitar um item 🟡

```sql
UPDATE promos        SET status = 'blocked',
                         blocked_reason = 'rejeitado na revisao manual'
                     WHERE item_id = 'MLB1234567890';
UPDATE promos_review SET status = 'rejected' WHERE item_id = 'MLB1234567890';
```

### Rejeitar tudo que está pendente de uma vez 🟡

Útil se a fila acumulou e você não quer nada dali:

```sql
UPDATE promos SET status = 'blocked',
                  blocked_reason = 'rejeitado em lote na revisao manual'
WHERE item_id IN (SELECT item_id FROM promos_review WHERE status = 'pending');

UPDATE promos_review SET status = 'rejected' WHERE status = 'pending';
```

---

## 5. Conferir o que foi postado

### O que saiu hoje 🟢

```sql
SELECT to_char(posted_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
       left(title, 70)          AS titulo,
       price_cents / 100.0      AS preco_reais,
       discount_pct             AS desconto,
       telegram_message_id      AS msg_id,
       utm_link
FROM promos
WHERE status = 'posted'
  AND (posted_at AT TIME ZONE 'America/Sao_Paulo')::date
      = (now()  AT TIME ZONE 'America/Sao_Paulo')::date
ORDER BY posted_at DESC;
```

### Panorama geral da fila e do histórico 🟢

A consulta mais útil do runbook. Uma linha por status:

```sql
SELECT status,
       count(*)                                    AS quantidade,
       round(avg(discount_pct), 1)                 AS desconto_medio,
       to_char(max(created_at) AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS mais_recente
FROM promos
GROUP BY status
ORDER BY quantidade DESC;
```

Leitura do resultado:

- `pending` alto e `posted` parado → o Publisher não está rodando (veja
  [troubleshooting P1](troubleshooting.md#p1--o-bot-não-está-postando-nada))
- `pending` zerado → a fila esvaziou; é normal em nicho pequeno. O Scanner enche de novo
- `blocked` crescendo muito rápido → o filtro pode estar apertado demais; investigue com a
  [seção 7](#7-calibrar-os-filtros-olhando-os-dados)
- `review` acumulando → você tem trabalho de curadoria esperando na
  [seção 4](#4-revisar-a-fila-de-revisão-humana)

### Quanto falta para o teto de hoje 🟢

```sql
SELECT count(*) AS postados_hoje,
       40 - count(*) AS ainda_cabem_hoje,
       (SELECT count(*) FROM promos
        WHERE status = 'posted'
          AND posted_at > now() - interval '1 hour') AS postados_ultima_hora,
       6 - (SELECT count(*) FROM promos
            WHERE status = 'posted'
              AND posted_at > now() - interval '1 hour') AS ainda_cabem_na_hora
FROM promos
WHERE status = 'posted'
  AND posted_at::date = CURRENT_DATE;
```

Teto vigente: **40**/dia e **6** na última hora corrida (não é relógio cheio).

### A próxima promoção que vai sair 🟢

```sql
SELECT item_id, left(title, 80) AS titulo,
       price_cents / 100.0 AS preco_reais,
       discount_pct AS desconto,
       CASE WHEN coalesce(utm_link, '') NOT LIKE '%matt_word=caed1312314%'
             OR coalesce(utm_link, '') NOT LIKE '%matt_tool=96097202%'
            THEN 'ATENCAO: sem link de afiliado, este item NAO sera publicado'
            ELSE 'ok' END AS link,
       CASE WHEN coalesce(thumbnail, '') NOT LIKE 'http%'
            THEN 'ATENCAO: sem foto, este item NAO sera publicado'
            ELSE 'ok' END AS foto
FROM promos
WHERE status = 'pending'
ORDER BY CASE WHEN search_term = 'loja:pokemon' THEN 0
              WHEN search_term = 'loja:copag' THEN 1
              ELSE 2 END,
         (COALESCE(original_price_cents, price_cents) - price_cents) DESC,
         discount_pct DESC
LIMIT 5;
```

> Atenção: o primeiro item desta lista **não é necessariamente o próximo post**. O Publisher
> ignora quem está sem link de afiliado ou sem foto — o próximo a sair é o primeiro com `link`
> e `foto` iguais a `ok`.

As duas colunas de aviso apontam as duas travas de publicação. Nenhuma das duas trava a fila:
o item fica parado em `pending`, os outros passam na frente, e ele volta a ser publicável
quando o dado for corrigido.

- **Sem link de afiliado:** proposital, porque post sem comissão é pior do que post nenhum
  ([Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado)).
  Para consertar, regrave o `utm_link`
  ([P16](troubleshooting.md#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos)).
- **Sem foto:** sem uma URL `http` no `thumbnail`, o Telegram recusaria o envio
  ([Decisão 26](historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila)).
  Para consertar, regrave o `thumbnail` — ou deixe o item quieto, que ele não atrapalha.

Os itens barrados aparecem em `promos_erros` com `error_step = 'afiliado'` ou `'foto'`, então
dá para achá-los sem adivinhar
([seção 6](#6-conferir-se-o-parser-quebrou)).

---

## 6. Conferir se o parser quebrou

Este é o risco número um do projeto: o bot lê o HTML da página do Mercado Livre, e o
Mercado Livre pode mudar esse HTML sem avisar ninguém. Quando isso acontece, o bot **avisa**
gravando em `promos_erros` em vez de ficar em silêncio.

### O check rápido 🟢

```sql
SELECT count(*) AS erros_ultimas_24h
FROM promos_erros
WHERE created_at > now() - interval '24 hours';
```

**Zero é o resultado esperado.** Qualquer número acima de zero merece um olhar.

### Ver os erros com detalhe 🟢

```sql
SELECT id,
       to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
       error_step,
       coalesce(item_id, '(sem item — provável quebra do parser)') AS item,
       left(error_msg, 160) AS mensagem
FROM promos_erros
ORDER BY created_at DESC
LIMIT 20;
```

**Como interpretar:**

| O que você vê | O que significa |
| --- | --- |
| `error_step = 'busca'` e item vazio | **O parser não conseguiu ler a página.** É o caso mais grave |
| Mensagem contém `suspicious-traffic` | **O anti-bot do Mercado Livre voltou.** Veja [troubleshooting P3](troubleshooting.md#p3--o-anti-bot-do-mercado-livre-voltou) |
| Mensagem contém `_n.ctx.r nao encontrado` | O Mercado Livre mudou o formato da página. Veja [troubleshooting P2](troubleshooting.md#p2--promos_erros-enchendo-com-error_stepbusca--o-parser-quebrou) |
| `error_step = 'post'` | O Telegram recusou a publicação. Veja [troubleshooting P4](troubleshooting.md#p4--post-falhando-com-erro-400-do-telegram) |
| `error_step = 'busca'` **com** item preenchido | Falha ao gravar no banco, não no parser |

### Ver o diagnóstico completo de uma quebra 🟢

O `payload` guarda um retrato do momento da falha, inclusive um trecho da página:

```sql
SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
       payload ->> 'motivo'       AS motivo,
       payload ->> 'anti_bot'     AS anti_bot,
       payload ->> 'html_length'  AS tamanho_html,
       payload ->> 'cards_brutos' AS cards_encontrados,
       payload ->> 'fonte'        AS estrategia_usada,
       payload ->> 'html_snippet' AS trecho_da_pagina
FROM promos_erros
WHERE error_step = 'busca' AND item_id IS NULL
ORDER BY created_at DESC
LIMIT 3;
```

O campo `trecho_da_pagina` traz os primeiros 600 caracteres do que o Mercado Livre
devolveu. É o que permite descobrir se veio página de bloqueio, página vazia, ou uma página
normal em formato novo.

### Limpar erros já resolvidos 🟡

Depois de resolver o problema, dá para limpar para o painel voltar a ficar limpo:

```sql
DELETE FROM promos_erros WHERE created_at < now() - interval '7 days';
```

---

## 7. Calibrar os filtros olhando os dados

Todas as decisões ficam gravadas justamente para você poder ajustar as regras com base em
fatos. Onde mexer em cada parâmetro está em
[regras-de-negocio.md](regras-de-negocio.md#mapa-rápido-onde-mora-cada-parâmetro).

### O que o bot decidiu nos últimos 7 dias 🟢

```sql
SELECT decision AS decisao, count(*) AS quantidade
FROM promos_log
WHERE created_at > now() - interval '7 days'
GROUP BY decision
ORDER BY quantidade DESC;
```

### Distribuição de desconto: o corte está no lugar certo? 🟢

```sql
SELECT CASE
           WHEN discount_pct <  15 THEN '1. abaixo de 15% (descartado)'
           WHEN discount_pct <  30 THEN '2. de 15% a 30%'
           WHEN discount_pct <  45 THEN '3. de 30% a 45%'
           WHEN discount_pct <= 60 THEN '4. de 45% a 60%'
           ELSE                         '5. acima de 60% (bloqueado)'
       END AS faixa,
       count(*) AS quantidade
FROM promos
GROUP BY faixa
ORDER BY faixa;
```

Se a faixa 5 estiver enorme, o mercado dessa categoria trabalha com descontos altos e vale
reavaliar o teto de 60%. Se a faixa 1 for a maioria, o mínimo de 15% está barrando muita
coisa e o canal terá pouco volume.

### Por que os produtos estão sendo bloqueados 🟢

```sql
SELECT left(title, 60)      AS titulo,
       discount_pct         AS desconto,
       left(blocked_reason, 130) AS motivo
FROM promos
WHERE status = 'blocked'
ORDER BY created_at DESC
LIMIT 30;
```

Leia os motivos com atenção crítica. Se você vê produto claramente original sendo bloqueado
como falsificado, o filtro está apertado demais — provavelmente por causa de uma penalidade
de lote. Se vê produto claramente falso passando, falta um termo na lista.

### Separar bloqueio por golpe de bloqueio por falsificação 🟢

```sql
SELECT CASE WHEN blocked_reason LIKE 'suspeita de golpe%'        THEN 'desconto alto (golpe)'
            WHEN blocked_reason LIKE 'suspeita de falsificacao%' THEN 'autenticidade'
            ELSE 'outro' END AS tipo_de_bloqueio,
       count(*) AS quantidade
FROM promos
WHERE status = 'blocked'
GROUP BY tipo_de_bloqueio;
```

### Histórico completo de um produto específico 🟢

```sql
SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
       decision AS decisao,
       reason   AS motivo
FROM promos_log
WHERE item_id = 'MLB1234567890'
ORDER BY created_at;
```

---

## 8. Rodar um workflow manualmente, sem ativar

Sempre faça isso depois de mudar qualquer coisa. Rodar na mão **não** requer que o workflow
esteja ativo, e é a única forma de descobrir erro de digitação em Code node.

> **Atenção:** a execução manual roda a versão **salva**, e o agendamento roda a versão
> **publicada**. Ou seja, testar na mão e ver tudo funcionando não garante que a produção
> mudou. Depois do teste, publique e confira — o passo a passo está em
> ["Salvar não é publicar", na seção 1](#1-ligar-e-desligar-o-bot).

1. Abra o workflow no n8n
2. Clique em **Execute workflow** (no rodapé ou no canto inferior direito)
3. Espere. Node com **círculo verde** deu certo; node com **borda vermelha** falhou
4. Clique em qualquer node para ver o que entrou e o que saiu dele

**O que esperar de cada workflow:**

| Workflow | Sinal de que deu certo |
| --- | --- |
| **Scanner** | O node `Normalize and Classify` mostra itens de saída, cada um com `decision` preenchido. No Scanner v2 o node `Exigir Pokemon no Titulo` vem em seguida. Nenhum node de erro acionado. A execução leva até um minuto a mais por causa do jitter — não é travamento |
| **Catalog Scanner** | **Não rode sem ler a Decisão 42.** Se for retomar: `TESTE_SO_POKEMON = true`, Name da credencial = `api_key`, uma execução **manual**. HTTP 200 com `_n.ctx.r` e produtos = avançar; 208 bytes / 500 = parar. **Não publique.** |
| **Publisher** | Se houver item na fila e você estiver dentro da janela de horário, um post aparece no canal. Se a fila estiver vazia, o node `Fetch Next Pending` mostra 0 itens e o fluxo para ali — isso está correto, não é erro |
| **Schema Setup** | Os 5 nodes de banco ficam verdes (`promos`, `promos_erros`, `promos_review`, `promos_log` e `cupons`). É seguro rodar quantas vezes quiser: usa só `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`, então não apaga nem altera nada |

**Cuidado com o Publisher:** rodar na mão **publica de verdade** no canal e consome um item
da fila. Não é ensaio.

**Se o Publisher não fizer nada e você não entender por quê:** olhe qual dos três portões
barrou. Clique nos nodes `Within 8h-22h BRT?`, `Under Daily Limit?` e `Fetch Next Pending`
para ver por onde o fluxo passou.

### Ver o histórico de execuções

No menu lateral do n8n, em **Executions**, ficam todas as execuções com o que entrou e saiu
de cada node. É o melhor lugar para investigar algo que aconteceu de madrugada.

---

## 9. Liberar um produto para ser reavaliado

Porque `item_id` é único, um produto já visto nunca é regravado. Se você quiser dar uma
segunda chance a um item específico (por exemplo, foi bloqueado por engano, ou o preço
mudou muito), há dois caminhos.

### Caminho A — colocar direto na fila (mais simples) 🟡

Só faz sentido se os dados gravados ainda estiverem certos:

```sql
UPDATE promos
SET status = 'pending', blocked_reason = NULL
WHERE item_id = 'MLB1234567890';
```

### Caminho B — apagar para o bot capturar de novo do zero 🟡

Use quando o preço mudou e você quer que o bot releia tudo do Mercado Livre:

```sql
DELETE FROM promos WHERE item_id = 'MLB1234567890';
```

Na próxima varredura, se o produto ainda estiver na página de ofertas, ele será tratado
como novo e reclassificado com as regras atuais. O histórico dele em `promos_log` continua
intacto.

### Republicar algo que já foi publicado 🟡

```sql
UPDATE promos
SET status = 'pending', posted_at = NULL, telegram_message_id = NULL
WHERE item_id = 'MLB1234567890';
```

Isso não apaga o post antigo do canal — só faz o bot publicar de novo. Apague o post antigo
à mão no Telegram se não quiser duplicidade.

---

## 10. Conferir o schema real do banco

Vale rodar se você suspeitar que o banco não está como esta documentação diz, ou depois de
qualquer mexida na estrutura.

### Colunas de todas as tabelas 🟢

```sql
SELECT table_name  AS tabela,
       ordinal_position AS ordem,
       column_name AS coluna,
       data_type   AS tipo,
       is_nullable AS aceita_vazio,
       column_default AS valor_padrao
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Índices existentes 🟢

```sql
SELECT tablename AS tabela, indexname AS indice, indexdef AS definicao
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### As 5 tabelas existem e quantas linhas têm 🟢

```sql
SELECT 'promos' AS tabela, count(*) FROM promos
UNION ALL SELECT 'promos_log',    count(*) FROM promos_log
UNION ALL SELECT 'promos_erros',  count(*) FROM promos_erros
UNION ALL SELECT 'promos_review', count(*) FROM promos_review
UNION ALL SELECT 'cupons',        count(*) FROM cupons;
```

Se esta última der erro dizendo que uma relação não existe, alguma tabela não foi criada.
Rode o `Pokemon Schema Setup v2`, que recria todas elas e os índices de forma idempotente
(o SQL de cada tabela está em [banco-de-dados.md](banco-de-dados.md)).

---

## 11. Rotina sugerida

Não é obrigação, é o mínimo que mantém o bot honesto.

**Nos primeiros dias depois de ligar (uma vez por dia, 5 minutos):**

1. Abra o canal e olhe os últimos posts. Estão bonitos? Os produtos fazem sentido?
2. Rode o check de erros da [seção 6](#6-conferir-se-o-parser-quebrou)
3. Rode o panorama da [seção 5](#5-conferir-o-que-foi-postado)
4. Olhe a fila de revisão da [seção 4](#4-revisar-a-fila-de-revisão-humana)

**Depois, semanalmente (10 minutos):**

1. Check de erros
2. Panorama geral
3. Fila de revisão
4. Uma olhada nas consultas de calibração da [seção 7](#7-calibrar-os-filtros-olhando-os-dados)

**Quando o Mercado Livre anunciar campanha de cupom:** cadastre na hora
([seção 3](#3-cadastrar-um-cupom)) e deixe um lembrete para desligar quando vencer — apesar
de o bot já filtrar por validade automaticamente, cupom antigo cadastrado só suja a tabela.

**Sinal de alerta que merece atenção imediata:** nenhum post novo no canal por mais de um
dia dentro da janela de horário, ou `promos_erros` com linhas novas. Os dois casos estão no
[troubleshooting](troubleshooting.md).

---

## 12. Lista de bloqueio de vendedores

Existe desde 13/08/2026, depois da descoberta de que o selo "Loja oficial" do Mercado Livre
não garante nada (veja [P15 no troubleshooting](troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon)).
Quando o nome do vendedor aparece no anúncio e ele está nesta lista, o produto é bloqueado
na hora, sem passar pelo score de autenticidade.

É uma lista **de bloqueio apenas**. Estar fora dela nunca aprova ninguém — a ausência de um
nome não é sinal de nada, porque só ~3% dos anúncios expõem o vendedor.

### Ver quem está bloqueado 🟢

```sql
SELECT nome, motivo, ativo, created_at
FROM vendedores_bloqueados
ORDER BY nome;
```

### Bloquear um vendedor novo 🟡

Uma linha. O bot passa a rejeitar esse vendedor na varredura seguinte, sem precisar editar
workflow nenhum.

```sql
INSERT INTO vendedores_bloqueados (nome, motivo)
VALUES ('Nome Exato Do Vendedor', 'por que você está bloqueando')
ON CONFLICT (nome) DO NOTHING;
```

O `nome` precisa bater com o que aparece no anúncio. O bot compara sem diferenciar
maiúsculas, minúsculas ou acentos, então `lehadry joias` pega `Lehadry Jóias`.

### Desbloquear sem perder o histórico 🟡

```sql
UPDATE vendedores_bloqueados SET ativo = FALSE WHERE nome = 'Nome Exato Do Vendedor';
```

Preferir isto a `DELETE`: guarda o registro de que um dia aquele vendedor foi bloqueado e
por quê.

### Quem já está na lista

| Vendedor | Motivo |
| --- | --- |
| `Lehadry Jóias` | Anunciava carta Pokémon com marca POKÉMON autodeclarada e selo "Loja oficial"; é joalheria |
| `Vikn Comércio de Auto Peças` | Mesmo padrão; é loja de autopeças |

---

## 13. Escopo: quais lojas o bot pode publicar

Desde 13/08/2026 o bot publica ofertas de lojas oficiais do Mercado Livre cadastradas em
`lojas_confiaveis`. Quem varre é o `Pokemon Store Scanner`. **Dez lojas ativas** hoje:
`pokemon`, `copag`, `brinkjr`, `attack-toys`, `cade-meu-jogo`, `psz3d`,
`ilusoes-industriais`, `parolar`, `escala-miniaturas` e `dalo-vendas`. Nove usam o mesmo
`filtro_titulo` (Regra 0b / [Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova)):
cartas Pokémon no plural, acessórios de TCG **ou** boneco/figura, **com Pokémon no
título**. Funko, pelúcia, merch e lote continuam fora. A Escala Miniaturas **não** tem
`\bcartas\b`, porque a vitrine mistura single tipo “Carta Pokémon Nymble 9/94”. Desde
~22h35 de 13/08/2026, o desconto mínimo é **10%** em `pokemon` e `copag`, **15%** nas
outras oito
([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)).
O experimento de 5% em todas (Decisão 29) acabou. A busca de 16/08 não achou homepage
oficial nova com TCG/figura para cadastrar.

A COPAG entrou porque a loja oficial da Pokémon é *multiseller* e a COPAG é o vendedor real de
vários itens dentro dela — os cards mostram "COPAG por Pokémon" com selo de loja oficial.
Incluí-la não afrouxa o critério de procedência; é o mesmo vendedor por outra porta.
BrinkJr, Attack Toys, Cadê Meu Jogo, Psz3D, Ilusões Industriais, PAROLAR,
Escala Miniaturas e Dalo Vendas entraram depois, também como loja oficial ML (não da marca Pokémon),
só com produto TCG (lacrado, acessório ou figura Pokémon) que passa no filtro.

### Ver as lojas cadastradas e se estão ativas 🟢

```sql
SELECT slug, nome, ativa, desconto_minimo, filtro_titulo, ultima_varredura, ultimo_erro
FROM lojas_confiaveis
ORDER BY prioridade;
```

### Tirar uma loja de circulação 🟡

Enquanto uma loja está `ativa = TRUE`, as ofertas dela entram na fila e vão para o canal.
Para segurar sem apagar o cadastro:

```sql
UPDATE lojas_confiaveis SET ativa = FALSE WHERE slug = 'copag';
```

### Descartar o que já entrou na fila fora do escopo 🟡

Marcar como `descartado` em vez de apagar preserva a auditoria — e o `item_id` continua na
tabela, o que impede o produto de ser reinserido pela varredura seguinte.

```sql
UPDATE promos
SET status = 'descartado',
    blocked_reason = 'fora de escopo: loja nao liberada pela regra de 13/08/2026'
WHERE status = 'pending' AND search_term = 'loja:copag';

INSERT INTO promos_log (item_id, decision, reason)
SELECT item_id, 'descartado', blocked_reason
FROM promos WHERE status = 'descartado';
```

### A COPAG foi ligada em 13/08/2026 🟢

Ela já está com `ativa = TRUE`. Os números da primeira varredura com ela dentro:

| Loja | Produtos na vitrine | Barrados pelo filtro | Sobraram | Em oferta | Entraram na fila |
| --- | --- | --- | --- | --- | --- |
| pokemon | 3 | 0 | 3 | 2 | 1 |
| copag | 39 | 35 | 4 | 4 | 2 |

Números da varredura de 13/08/2026 às 18h01, já com o filtro novo. Os 35 barrados da COPAG
são Truco, Harry Potter, Bicycle, NFL, Turma da Mônica, pôquer, Lorcana e jogos de tabuleiro.
Quem segura todos eles é o `filtro_titulo` da linha da loja, não o código do workflow —
mexer nele afeta diretamente o que pode ir ao canal.

### O filtro de título: como mexer sem quebrar 🔴

Desde 16/08/2026 ([Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova))
nove lojas usam **o mesmo** `filtro_titulo`: exige Pokémon no título + vocabulário de carta,
acessório (sleeve, playmat, binder) **ou** figura (boneco, nendoroid, figuarts) e barra
Funko, pelúcia, lote, kit e avulso. A Escala Miniaturas usa a variante **sem** `\bcartas\b`.
A regra completa, com o texto da regex e o porquê de cada parte, está na
[Regra 0b das regras de negócio](regras-de-negocio.md#regra-0b--tcg-acessório-de-tcg-e-figura-pokémon-não-merch).

Para ver o que está valendo agora:

```sql
SELECT slug, ativa, filtro_titulo FROM lojas_confiaveis ORDER BY id;
```

**Nunca grave uma regex sem testar antes.** O Scanner aplica o filtro assim — original **ou**
normalizado — e você precisa reproduzir exatamente isso:

```js
const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9/ -]/g, ' ').replace(/ +/g, ' ').trim();
const re = new RegExp(SUA_REGEX, 'i');
const passa = (t) => re.test(t) || re.test(norm(t));

['Box Pokémon Coleção Mega Gengar Ex', 'Sleeves Pokémon Charizard', 'Boneco Pokémon Pikachu Articulado', 'Boneco Funko Pop! Pokémon - Slowpoke']
  .forEach(t => console.log(passa(t) ? 'PASSA ' + t : 'BARRA ' + t));
```

Salve num arquivo e rode com `node arquivo.js`. Se o box, o sleeve ou o boneco Pokémon não
passar, ou o Funko passar, não grave.

Dois cuidados que já custaram tempo:

- **Termo acentuado precisa de classe.** Escreva `pel[uú]cia`, nunca `pelúcia`. Como o teste
  também roda no título sem acento, um termo só acentuado não barra nada.
- **Regex inválida aborta a loja inteira.** É proposital: o Scanner prefere não varrer a
  varrer sem filtro. O erro vai para `promos_erros` e `lojas_confiaveis.ultimo_erro`.

Depois de gravar, rode o Scanner na mão e confira o resumo da varredura (quantos passaram,
quantos foram barrados) antes de considerar o trabalho terminado.

Para desligar de novo, sem perder o cadastro:

```sql
UPDATE lojas_confiaveis SET ativa = FALSE WHERE slug = 'copag';
```

### Cadastrar uma loja nova 🟡

**Achar o slug.** Abra a loja no navegador e olhe a URL: o slug é o trecho final de
`mercadolivre.com.br/loja/{slug}`. Em <https://www.mercadolivre.com.br/loja/copag> o slug é
`copag`. Se a loja abrir como `copag.mercadolivre.com.br`, o subdomínio é o mesmo slug.
Ignore tudo depois de `?`.

```sql
INSERT INTO lojas_confiaveis
  (slug, nome, ativa, prioridade, desconto_minimo, filtro_titulo, preco_minimo, preco_maximo, observacoes)
VALUES
  ('slug-da-loja', 'Nome da Loja', TRUE, 30, 15,
   (SELECT filtro_titulo FROM lojas_confiaveis WHERE slug = 'pokemon'),
   0, NULL, 'por que essa loja e confiavel')
ON CONFLICT (slug) DO NOTHING;
```

O que decidir em cada campo:

- `filtro_titulo` — **obrigatório sempre**, inclusive na loja oficial da Pokémon. Copie o
  filtro da loja `pokemon` (`SELECT filtro_titulo FROM lojas_confiaveis WHERE slug = 'pokemon'`),
  **não** o da Escala Miniaturas e **não** um `LIMIT 1` cego. Deixar `NULL` significa
  "aceita tudo", e foi assim que um Funko Pop foi parar no canal em 13/08/2026: a loja
  oficial estava sem filtro, e nem toda loja oficial da marca vende só carta.
- `desconto_minimo` — o corte de desconto daquela loja. **Vigente (Decisão 35):**
  `pokemon` e `copag` em **10%**; as outras oito ativas em **15%**. Não é mais o
  experimento de 5% da Decisão 29.

  Subir tudo para 15% (piso único de qualidade):

  ```sql
  UPDATE lojas_confiaveis SET desconto_minimo = 15 WHERE ativa = TRUE;
  ```

  Recolocar só Pokémon e COPAG em 10% (o Pacote A):

  ```sql
  UPDATE lojas_confiaveis SET desconto_minimo = 10 WHERE slug IN ('pokemon', 'copag');
  UPDATE lojas_confiaveis SET desconto_minimo = 15 WHERE ativa = TRUE AND slug NOT IN ('pokemon', 'copag');
  ```

  O teto anti-golpe de 60% do `Pokemon Scanner v2` **não muda** com isso — aquele workflow
  está desligado, e o Store Scanner usa só o mínimo da linha da loja.
- `preco_maximo` — `NULL` significa sem teto.
- `prioridade` — só define a ordem da varredura. Menor primeiro.

**Se você errar o slug**, o Mercado Livre responde HTTP 200 com uma página sem catálogo, e o
scanner registra isso em `promos_erros` e em `lojas_confiaveis.ultimo_erro` com a mensagem
"payload `_n.ctx.s.q` ausente". É o mesmo sintoma de loja removida.

### Conferir se a varredura está viva 🟢

Como o `Pokemon Store Scanner` é hoje o **único** scanner ativo, vale checar de vez em quando
se ele continua trabalhando. Estes três números se movem a cada execução:

```sql
SELECT slug, ultima_varredura, produtos_ultima, ofertas_ultima, COALESCE(ultimo_erro, 'sem erro') AS ultimo_erro
FROM lojas_confiaveis
WHERE ativa = TRUE;
```

Se `ultima_varredura` estiver parada há mais de **20 minutos**, o workflow parou ou foi
desativado (ritmo atual: 5 min + até 60s de jitter). Se `produtos_ultima` cair para zero, a loja esvaziou ou o Mercado Livre mudou o
layout — nesse caso `ultimo_erro` explica qual dos dois.

---

## 14. Alerta privado de saúde do bot

O `Pokemon Health Alert` (`3irgeWFKZGZZrJ5u`) avisa o Eduardo **no mesmo chat privado do
alerta LinkedIn** quando o bot TCG quebra ou para. **Nunca** publica no canal
`@promopokemontcg`.

O workflow LinkedIn **não foi alterado**. O alerta TCG só reutiliza o destino: o node
`Notify Telegram` do `LinkedIn Post Diario Texto` (`ysHFWIV0tGWJbhjo`), que manda HTTP para
o bot **Alertas Linkedin/TCG Promo** (`@eduardo_alerta_bot`) no chat privado do Eduardo.

### Ligar e desligar

1. Abra <https://srv1897392.hstgr.cloud/workflow/3irgeWFKZGZZrJ5u>
2. O botão **Active** liga ou desliga só o alerta. Scanner e Publisher continuam como
   estavam
3. Depois de mexer no código, **publique** — salvar não é publicar
   ([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada))

Rodar na mão (seção 8) **sempre** manda uma mensagem: teste "tudo ok" se não houver
sintoma, ou o alerta de verdade se houver. O agendamento das **21h BRT** só fala quando
há problema.

### O que gera um recado (tudo num único texto)

- Linhas novas em `promos_erros` nas últimas 24h
- Scanner: `ultimo_erro` preenchido, ou mais de ~90 min sem `ultima_varredura`
- Publisher: dentro de 8h–22h BRT, com item `pending` **publicável**, e nenhum post nas
  últimas ~2h
- Parser / vitrine vazia: `error_step = 'busca'` ou motivo de catálogo vazio recente

### O que ele NÃO cobre

- **Fila vazia.** Zero `pending` é o comportamento normal quando não há oferta nova. O
  texto do alerta deixa isso explícito. Não é defeito
- Instância n8n fora do ar — se o n8n não roda, este workflow também não avisa
- Qualidade do post, atribuição de comissão no painel de afiliados, ou volume baixo
- Falha do Scanner/Publisher que se recupera antes dos limiares (90 min / 2h)
- Ele **não** consulta o histórico de execuções da API do n8n (não há credencial). A
  saúde vem do banco: `promos_erros`, `lojas_confiaveis` e `promos`

Linhas de `error_step = 'afiliado'` ou `'foto'` também entram na contagem de 24h — não
são quebra do bot, são as travas da fila fazendo o trabalho. O recado lista o
`error_step` para você distinguir.

---

## 15. A esteira de réplica de WhatsApp

Esta seção é da segunda esteira ([Decisão 44](historico-de-decisoes.md#decisão-44--réplica-de-grupos-de-whatsapp-sem-curadoria-ao-lado-do-bot)):
copiar promoção de grupo de WhatsApp para o canal, trocando só o link de afiliado.

> **Estado em 02/09/2026:** Evolution API rodando, WhatsApp **pareado** na instância
> `promo-replica`, painel no modelo origem/destino ([Decisão 46](historico-de-decisoes.md#decisão-46--painel-origemdestino-com-todos-os-grupos-da-conta)),
> rota **TCG Promo** gravada. Ingest `70a5d99d` publica foto do polycard e o nome do
> produto na legenda ([Decisão 52](historico-de-decisoes.md#decisão-52--foto-oficial-do-anúncio-mesmo-quando-a-origem-veio-só-com-texto)).
> Painel: Config grava todos os ajustes da lista branca; HTML em `pagina_gz`
> ([Decisão 51](historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz),
> [Decisão 53](historico-de-decisoes.md#decisão-53--o-painel-grava-os-ajustes-da-lista-branca-e-o-html-sobe-por-script)).
> Se a página parecer cortada no meio do JavaScript, Ctrl+F5 (15.8).

**Use um chip separado, não o número pessoal.** Ler grupo de WhatsApp exige biblioteca não
oficial, e existe risco real de o número ser banido.

### 15.1 A Evolution API na VPS

Roda como projeto Docker `evolution-api` (`/docker/evolution-api/`), criado pelo Docker Manager
da Hostinger — não por SSH. O compose está versionado em
[`deploy/evolution-api/`](../deploy/evolution-api/) e é cópia fiel do que está na VPS.

O que vale saber sobre essa configuração:

- **Imagem: `evoapicloud/evolution-api`**, não `atendai/evolution-api`. A `atendai` é a que
  aparece na maioria dos tutoriais e **não sobe nesta VPS**: o Docker aceita o comando, não
  cria container e não deixa log. Trocar de repositório resolveu na hora.
- **Sem porta pública.** Quem alcança essa API manda mensagem, lê conversa e desconecta o
  aparelho. Ela escuta em `127.0.0.1:8080` e só o n8n fala com ela, pela rede `n8n_default`,
  no endereço `http://evolution-api:8080`.
- **Banco:** o mesmo Postgres do bot, no schema `evolution`. O schema é criado pelo workflow
  `Replica Schema Setup`, não pela Evolution.
- **O webhook aponta para `http://n8n:5678/...`, não para o domínio público.** De dentro do
  container, `srv1897392.hstgr.cloud` resolve para `127.0.1.1`, e toda entrega morre com
  `ECONNREFUSED ... :443` — o log parece dizer que o n8n caiu, e não é isso. Como os dois
  containers estão na rede `n8n_default`, falar pelo nome do serviço resolve e ainda evita a
  volta pela internet.
- **Recriar o container não desconecta o WhatsApp.** A sessão fica no banco e no volume
  `evolution_instances`; ao subir, o log diz `Auto-connecting instance "promo-replica"`. Só
  precisa de QR novo se o volume for apagado.
- **Senha do banco:** vai percent-encoded na URI. Veja o aviso no fim desta seção.

Para mexer nela (reiniciar, ver log, atualizar), use o Docker Manager no painel da Hostinger,
ou o MCP da Hostinger a partir daqui. Os logs saem por projeto, e é lá que aparece qualquer
erro de conexão com o banco.

> ⚠️ **A senha do Postgres não é a que está escrita no `.env` da VPS.** O arquivo
> `/docker/pokemon-postgres/.env` diz `PkmnPromos2026!Br$ecure`, mas o Docker Compose
> interpretou `$ecure` como variável e apagou esse pedaço quando o banco foi criado. A senha
> que o banco aceita é **`PkmnPromos2026!Br`**. Qualquer serviço novo ligado a esse Postgres
> vai tropeçar aqui — e o erro que aparece é um `P1000: Authentication failed`, que parece
> problema de usuário, não de escape de shell.

### 15.2 As duas credenciais no n8n

Já existem. Nenhuma pode ser criada por programa; se precisar recriar, é à mão em
<https://srv1897392.hstgr.cloud/home/credentials>:

| Credencial | Tipo | Como preencher | Onde usar |
| --- | --- | --- | --- |
| `Painel Replica` | **Basic Auth** | Usuário e senha que você escolher | Só no GET do `Replica Painel` e no `Abrir Conexao` do `Replica WhatsApp Conectar`. Os POSTs do painel usam token de save, não esta senha |
| `Evolution API Key` | **Header Auth** | Name: `apikey` · Value: o `EVOLUTION_API_KEY` do `.env` da Evolution | No `Baixar Imagem da Evolution` (Ingest) e nos dois nodes HTTP do `Replica WhatsApp Conectar` |

Os nodes `Seguir Redirecionamento 1` e `2` **não usam credencial** — são requisições anônimas
a encurtador. Se o n8n reclamar de credencial faltando neles, ignore.

### 15.3 Conectar o WhatsApp (ler o QR code)

Abra <https://srv1897392.hstgr.cloud/webhook/replica/conectar> e entre com o Basic Auth.

Essa página é o workflow `Replica WhatsApp Conectar` (`v32gcVzRkedUACXD`): ele cria a instância
se ela não existir, pede o QR à Evolution e desenha na tela. A página se recarrega a cada 25
segundos porque o código expira em torno de 40. No celular:
**WhatsApp → Aparelhos conectados → Conectar aparelho**.

Quando parear, a mesma página passa a dizer que já está conectado — é assim que se confere o
estado depois, sem SSH e sem `curl`. Se a sessão cair um dia, é a mesma página que reconecta.

Depois de conectar, **entre nos grupos com esse número**: a Evolution só vê grupo do qual o
número participa.

### 15.4 Os workflows publicados

Os quatro já estão publicados:

| Workflow | ID | Papel |
| --- | --- | --- |
| `Replica WhatsApp Ingest` | `4mE343XrNXgIwAIF` | Recebe a mensagem e replica |
| `Replica Painel` | `lWDnggRX8xQmYyQV` | Origens, destinos e log |
| `Replica WhatsApp Conectar` | `v32gcVzRkedUACXD` | Página do QR code |
| `Replica Nomes Sync` | `J6zU6p48OEBO0raf` | A cada 10 min, lista todos os `@g.us` com `fetchAllGroups` (timeout 120 s, ~80 s) e cacheia em `replica_rotas`. O GET do painel **não** chama essa API. `findChats` / `evolution."Chat"` voltam vazios (`DATABASE_SAVE_DATA_CHATS=false`). |

Se mexer em algum, lembre que **salvar não é publicar**
([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

### 15.5 Escolher origem e destino no painel

Abra <https://srv1897392.hstgr.cloud/webhook/replica/entrar> (login da própria página) ou
<https://srv1897392.hstgr.cloud/webhook/replica/painel> com Basic Auth.

O painel tem páginas: **Visão Geral**, **Conexões**, **Rotas**, **Configurações**, **Atividades**.
A lista de grupos vem dos chats que a Evolution já viu nesta conta — pelo **nome**, não pelo JID.
O número precisa **já estar no grupo**. Entre no grupo com o número do QR e recarregue.

1. Em **Conexões**, o WhatsApp mostra o QR se estiver desconectado (`/webhook/replica/conectar`).
   O Telegram usa o canal já cadastrado (`@promopokemontcg`); **Reconfigurar** troca o `@`,
   **não** é login OAuth. **Desconectar** tira o canal das rotas.
2. Em **Rotas**, clique em **+ Nova Rota**. No modal: nome da rota, origens WhatsApp e
   destinos Telegram/WhatsApp. Cada combo tem um campo **sempre visível**
   (**Pesquisar grupos...** / **Pesquisar destinos...**): clique, digite parte do nome
   (ou do JID, se o título ainda não chegou) e a lista encolhe na hora. **Enter** escolhe
   o primeiro visível; **Escape** fecha. **Salvar Alterações** — a página deve recarregar
   sem alerta. Se pedir senha, é a do **painel** (Basic Auth do GET), não a do Connect
   Afiliado. O POST de save não exige mais Basic Auth do browser
   ([Decisão 47](historico-de-decisoes.md#decisão-47--token-de-save-no-json-porque-o-chrome-não-reenvia-basic-auth-no-fetch)).
   Se um grupo ainda não tiver título, o combo mostra `Grupo` + os últimos 6 dígitos do
   JID e o aviso pede para recarregar depois do `Replica Nomes Sync`.
3. No card da rota: toggle **ATIVA**, **Editar**, **Excluir**.
4. **Comece com uma origem só.** Olhe **Atividades** por algumas horas antes da segunda origem.

**Não use o mesmo grupo como origem e destino.** Isso criaria um loop. O ingest recusa essa
combinação; o painel avisa.

O destino (Telegram e WhatsApp) recebe a **foto oficial do anúncio** no Mercado Livre,
mesmo se o grupo de origem mandou só texto
([Decisão 52](historico-de-decisoes.md#decisão-52--foto-oficial-do-anúncio-mesmo-quando-a-origem-veio-só-com-texto)).
A foto vem do polycard do HTML do encurtador. Se isso falhar, tenta a página do produto
e depois a foto da origem. Sem as três, o post segue só texto.

### 15.6 Desligar tudo, rápido

Três níveis, do mais brando ao mais bruto:

| Quero | Faça |
| --- | --- |
| Parar um grupo | Tire-o da rota (Editar) ou desligue o toggle **ATIVA** do card |
| Parar a esteira inteira, mantendo o Ingest publicado | Clique em **Réplica ligada** no topo do painel (isso grava `replica_config.ativo = false`) |
| Parar mesmo, painel inclusive | Despublique o `Replica WhatsApp Ingest` no n8n |

O bot de curadoria **não é afetado** por nada disso — são esteiras separadas.

### 15.7 Conferir se está funcionando

🟢 As últimas 30 mensagens vistas, com o motivo de cada uma:

```sql
SELECT to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
       COALESCE(origem_nome, origem_chat_id) AS origem,
       status,
       motivo,
       links_convertidos,
       LEFT(texto_publicado, 80) AS trecho
  FROM replica_log
 ORDER BY id DESC
 LIMIT 30;
```

🟢 Resumo por motivo nas últimas 24h — é o que mostra se algum grupo só manda link de outro
marketplace:

```sql
SELECT status,
       COALESCE(motivo, '(sem motivo)') AS motivo,
       COUNT(*) AS quantas
  FROM replica_log
 WHERE criado_em > NOW() - INTERVAL '24 hours'
 GROUP BY status, motivo
 ORDER BY quantas DESC;
```

🟢 Os grupos e o quanto cada um rende:

```sql
SELECT chat_id, nome, ativa, mensagens_vistas, replicadas, ultima_mensagem
  FROM replica_rotas
 ORDER BY ativa DESC, ultima_mensagem DESC NULLS LAST;
```

**Como ler isso:** `mensagens_vistas` alto com `replicadas` zero e motivo
`sem_link_do_mercado_livre` significa grupo que não serve para você — ele posta de outros
marketplaces. `status = 'erro'` com motivo do Telegram é problema de publicação, não de origem.

### 15.8 Mexer no painel (ajustes e página)

Há **dois jeitos** de alterar o painel, e misturar os dois é o que mais gera confusão.

**A. Ajustes da réplica (pelo site, sem republicar o n8n)**

Abra <https://srv1897392.hstgr.cloud/webhook/replica/entrar> (ou `/webhook/replica/painel`
com Basic Auth) → aba **Configurações**. Cada campo grava na hora em `replica_config`
via POST `/webhook/replica/painel/config` (token de save no JSON, não a senha do login).
A lista branca do node `Normalizar Config` é o que o formulário expõe:

| Campo na tela | Chave | Para que serve |
| --- | --- | --- |
| Teto de posts por hora | `teto_hora` | Freio anti-flood (hoje 40) |
| Espera antes de publicar | `delay_segundos` | Pausa entre posts (hoje 5) |
| Atraso máximo da mensagem | `atraso_maximo_segundos` | Mensagem mais velha que isso não replica (hoje 600) |
| Limite da legenda no Telegram | `limite_legenda_telegram` | Corta a legenda (hoje 1024) |
| Replicar cupom sem link | `replicar_cupom_sem_link` | Cupom só de código |
| Canal Telegram padrão | `destino_telegram` | Fallback se a rota não tiver destino TG |
| Word ID / Tool ID | `afiliado_matt_word` / `afiliado_matt_tool` | Parâmetros do link de comissão |
| Frases extras a remover | `frases_remover` | Uma por linha. `@rasgabooster` já sai no ingest |
| Formato do post (JSON) | `formato_post` | Objeto JSON. JSON inválido o n8n recusa e **nada grava** |
| Plataformas para replicar | `plataformas` | Hoje só **Mercado Livre** tem afiliação. Amazon/Shopee/Magalu aparecem desligadas. Oferta só de `amzn.to` é descartada (`plataforma_nao_selecionada`) |

O interruptor da sidebar grava `ativo`. Rotas e o Telegram de uma rota específica
continuam na aba **Rotas** / **Conexões**, via `/salvar`. `pagina_gz` e `save_token`
**não** aparecem no formulário de propósito ([P20](troubleshooting.md#p20--o-painel-da-réplica-abre-mas-nada-funciona)).

**B. Visual da página (HTML)**

O HTML mora em
[`backups/2026-08-28/painel/replica-painel.html`](../backups/2026-08-28/painel/replica-painel.html).
**Produção lê `replica_config.pagina_gz`**, não o Code node. A coluna guarda base64 UTF-8
do HTML (não gzip). Em 02/09 à noite o valor vigente é **70692** bytes, MD5
`e5eb09d6e08e890991bff149a3e51739` (HTML 53018, MD5 `920896650126ad6633ed6c5d2e5ff547`).
O fechamento original de 29/08 era 63424 / `f8fccee12aa8e6e98ecf12d2a7221d2a`
([Decisão 51](historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz)).

Para alterar o visual:

1. Edite o HTML no arquivo acima. **Proibido** aspas duplas e barra invertida — o
   validador do script recusa, e o Code node de paraquedas também.
2. Publique: `python3 tools/publicar-painel.py` (precisa de `N8N_API_KEY`).
   O script abre `pagina_gz` na whitelist **só durante o POST** e depois fecha
   de novo. Não deixe essa chave permanente no formulário.
3. **Ctrl+F5** no browser. Cache velho mostra JS cortado mesmo com o banco certo
   ([P20](troubleshooting.md#p20--o-painel-da-réplica-abre-mas-nada-funciona)).
4. Confira no n8n: `Replica Painel` com `versionId` = `activeVersionId`.

A tela de login (`/webhook/replica/entrar`) é outro arquivo:
[`backups/2026-08-28/painel/replica-login.html`](../backups/2026-08-28/painel/replica-login.html).
Ela mora no Code node `Montar Pagina Login`, não em `pagina_gz`. Para republicar:
`python3 tools/publicar-painel.py --login`.

O gerador [`tools/gerar-painel-code-node.mjs`](../tools/gerar-painel-code-node.mjs) ainda
existe como paraquedas: ele embute o HTML no Code node. Só use se a Decisão 51 for
revertida. O caminho do dia a dia é o `publicar-painel.py`.

**Cuidados ao gravar o workflow no n8n:** o PUT aceita em `settings` só
`executionOrder` / `availableInMCP` / `timezone`. Mandar `binaryMode` devolve 400.
