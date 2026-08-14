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

---

## 1. Ligar e desligar o bot

> **Estado em 14/08/2026, ~18h43 BRT: Store Scanner, Publisher e Health Alert estão ativos.**
> Scanner a cada **5 min**, Publisher a cada **2 min** (8h–22h BRT, teto 40/dia e 6/hora).
> Mínimo **10%** em `pokemon`/`copag`, **15%** nas outras. Filtro: cartas Pokémon +
> acessórios TCG com Pokémon no título (Decisão 37). O passo a passo
> abaixo continua valendo para quando você quiser desligar ou religar.

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
2. Abra o workflow **Pokemon Store Scanner** (`PNwaF3BYhj5KA8eY`) — é ele que alimenta a fila
   hoje. O `Pokemon Scanner v2` (`39kdRchYI6CwsbNY`) está fora de escopo e deve continuar
   desativado
3. No canto superior direito, clique no botão **Active** (em algumas versões do n8n aparece
   como **Publish**). Ele fica verde ou marcado
4. Repita para o **Pokemon Publisher v2** (`FXNWeT9C7dEA0DUY`)
5. O **Pokemon Health Alert** (`3irgeWFKZGZZrJ5u`) também deve ficar ativo — alerta privado,
   não publica no canal

Pronto, o bot está no ar. A partir daí:

- O Scanner varre as vitrines das lojas a cada **5 minutos**, com uma espera aleatória de até 60
  segundos antes de acessar o site (por isso o intervalo real varia de ~4 a ~6 minutos).
  **Não baixe para 2 minutos:** são 9 lojas HTTP por ciclo.
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

Quando o Mercado Livre anunciar uma campanha de cupom (você recebe isso pelos canais
oficiais de afiliados), cadastre aqui e o cupom passa a aparecer nos posts automaticamente,
sem precisar mexer em workflow nenhum.

### Cadastrar 🟡

```sql
INSERT INTO cupons (codigo, descricao, valor_minimo_cents, valido_ate, prioridade, observacao)
VALUES (
    'MELI10',                                 -- o código digitável
    '10% OFF em Cartas Colecionáveis',        -- o texto que aparece no post
    7900,                                     -- pedido mínimo em CENTAVOS (R$ 79,00)
    '2026-08-20 23:59:00-03',                 -- validade, com o -03 do fuso de Brasília
    100,                                      -- prioridade: o maior vence se houver vários
    'campanha de agosto, veio pelo canal de afiliados'
);
```

**Cuidados ao preencher:**

| Campo | Cuidado |
| --- | --- |
| `codigo` | Se o cupom for automático no checkout (sem código para digitar), use `NULL` |
| `descricao` | É o texto exato que vai aparecer no post. Escreva pensando no assinante lendo |
| `valor_minimo_cents` | **Em centavos.** R$ 79,00 é `7900`, não `79`. Use `NULL` se não houver mínimo |
| `valido_ate` | Sempre com o `-03` no fim, que é o fuso de Brasília. Sem isso o banco assume UTC e o cupom expira 3 horas antes do que você quer |
| `prioridade` | Só importa se houver mais de um cupom válido ao mesmo tempo |

**Não use `categoria_id = 'MLB6899'` nos posts atuais.** Os itens do Store Scanner entram
com `category_id` NULL; o JOIN só casa se o cupom também tiver `categoria_id` NULL (ou se
os dois tiverem o mesmo valor). Com `MLB6899` no cupom, o post sai **sem** a linha.
Deixe `categoria_id` de fora — vale para qualquer produto que o bot postar.

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
| **Scanner** | O node `Normalize and Classify` mostra vários itens de saída (uns 9), cada um com `decision` preenchido. Nenhum node de erro acionado. A execução leva até um minuto a mais por causa do node `Random Jitter`, que espera de propósito — não é travamento |
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
`lojas_confiaveis`. Quem varre é o `Pokemon Store Scanner`. **Nove lojas ativas** hoje:
`pokemon`, `copag`, `brinkjr`, `attack-toys`, `cade-meu-jogo`, `psz3d`,
`ilusoes-industriais`, `parolar` e `escala-miniaturas`. Oito usam o mesmo
`filtro_titulo` (Regra 0b / [Decisão 37](historico-de-decisoes.md#decisão-37--cartas-pokémon-no-plural-e-acessórios-de-tcg-com-pokémon-no-título)):
cartas Pokémon no plural **e** acessórios de TCG (sleeve, playmat, binder…) **com Pokémon
no título**. A Escala Miniaturas **não** tem `\bcartas\b`, porque a vitrine mistura
single tipo “Carta Pokémon Nymble 9/94”. Desde ~22h35 de 13/08/2026, o desconto
mínimo é **10%** em `pokemon` e `copag`, **15%** nas outras sete
([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)).
O experimento de 5% em todas (Decisão 29) acabou.

A COPAG entrou porque a loja oficial da Pokémon é *multiseller* e a COPAG é o vendedor real de
vários itens dentro dela — os cards mostram "COPAG por Pokémon" com selo de loja oficial.
Incluí-la não afrouxa o critério de procedência; é o mesmo vendedor por outra porta.
BrinkJr, Attack Toys, Cadê Meu Jogo, Psz3D, Ilusões Industriais, PAROLAR e
Escala Miniaturas entraram depois, também como loja oficial ML (não da marca Pokémon),
só com produto TCG (lacrado ou acessório Pokémon) que passa no filtro.

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

Desde 14/08/2026 ([Decisão 37](historico-de-decisoes.md#decisão-37--cartas-pokémon-no-plural-e-acessórios-de-tcg-com-pokémon-no-título))
oito lojas usam **o mesmo** `filtro_titulo`: exige Pokémon no título + vocabulário de carta
**ou** acessório (sleeve, playmat, binder, deck box, toploader) e barra Funko, lote, kit e
avulso. A Escala Miniaturas usa a variante **sem** `\bcartas\b`. A regra completa, com o
texto da regex e o porquê de cada parte, está na
[Regra 0b das regras de negócio](regras-de-negocio.md#regra-0b--só-produto-de-tcg-não-qualquer-produto-pokémon).

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

['Box Pokémon Coleção Mega Gengar Ex', 'Sleeves Pokémon Charizard', 'Boneco Funko Pop! Pokémon - Slowpoke']
  .forEach(t => console.log(passa(t) ? 'PASSA ' + t : 'BARRA ' + t));
```

Salve num arquivo e rode com `node arquivo.js`. Se o box ou o sleeve não passar, ou o Funko
passar, não grave.

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
  `pokemon` e `copag` em **10%**; as outras sete ativas em **15%**. Não é mais o
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
