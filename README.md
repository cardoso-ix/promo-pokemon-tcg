# Promo Pokémon TCG — bot de promoções

Bot automatizado que varre as promoções de **cartas Pokémon TCG** no Mercado Livre,
filtra o que não presta (golpe de preço, produto falsificado, desconto irrelevante)
e publica o que sobra no canal do Telegram **[@promopokemontcg](https://t.me/promopokemontcg)**
com o **link de afiliado do Eduardo**, para gerar comissão em cada venda.

Esta pasta é a **fonte única de verdade** do projeto. O bot inteiro vive dentro do n8n na
VPS; aqui está a documentação de *como ele funciona*, *onde mexer em cada coisa* e *por que
as decisões foram tomadas assim*, mais uma cópia de segurança dos workflows em
[`backups/`](backups/) — que não é executada, serve para restaurar se algo se perder.

> **Se você é um agente de IA lendo esta pasta pela primeira vez:** leia este README
> inteiro, depois `docs/estado-atual.md` e `docs/arquitetura.md`. Os três juntos são o mapa
> para retomar sem repetir teste. Os outros arquivos são referência para tarefas
> específicas. A regra de ouro do projeto é que **o n8n é a fonte da verdade** — se esta
> documentação divergir do que está configurado no n8n, o n8n está certo e a documentação
> está velha (e vale corrigir a documentação).

---

## ▶️ O BOT ESTÁ NO AR (conferido em 13/08/2026, ~22h40 BRT)

Religado à tarde, depois que o link de afiliado foi confirmado, corrigido nos dois scanners
e regravado na fila. Formato em produção:

`?matt_word=caed1312314&matt_tool=96097202&forceInApp=true`

Histórico: [troubleshooting, P16](docs/troubleshooting.md#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos).

**O que está ligado agora (n8n ao vivo, `versionId` = `activeVersionId` nos três ativos):**

| Workflow | Ritmo | Papel |
| --- | --- | --- |
| `Pokemon Store Scanner` | a cada **5 min** + jitter 0–60s | Enche a fila a partir de **9 lojas** oficiais |
| `Pokemon Publisher v2` | a cada **2 min**, só 8h–22h BRT, teto **40**/dia e **4**/hora | Publica 1 item por disparo, ordem de qualidade |
| `Pokemon Health Alert` | 1× ao dia às 21h BRT + manual | Alerta **privado** se o bot quebrar. Fila vazia **não** avisa |

Desconto mínimo vigente ([Decisão 35](docs/historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)): **10%** em `pokemon` e `copag`; **15%** nas outras sete. Item já postado cuja vitrine ficar mais barata (≥ 5% ou ≥ R$ 5, no máximo 1/dia) volta para a fila ([Decisão 33](docs/historico-de-decisoes.md#decisão-33--repostar-se-o-preço-da-vitrine-cair-depois-do-post)).

**Não use 2 minutos no Scanner.** São 9 requisições HTTP por ciclo. O aviso está na descrição do próprio workflow no n8n e na [Decisão 34](docs/historico-de-decisoes.md#decisão-34--ritmo-em-produção-scanner-5-min-publisher-2-min).

### 🤔 Por que o canal pode estar quieto

Há **duas** razões, e nenhuma é pane:

1. **Fora da janela (22h–8h BRT).** O Publisher acorda a cada 2 min, vê a hora e termina em milissegundos em `Outside Posting Window`. A fila espera. Volta sozinho às 8h.
2. **Acabou o produto em oferta nas vitrines.** A varredura das ~22h10 BRT confirmou: 9 lojas varridas com sucesso, **zero aceitos**. Exemplo: o *Dragapult Ex League Battle Deck* na loja Pokémon estava a preço cheio; o *Box Mega Luar Mega Gengar Ex* na COPAG estava com 2,14% (abaixo de 10%); o resto caiu no filtro de título (Truco, Harry Potter, brinquedo).

À tarde (18h10), com só `pokemon` + `copag` e mínimo ainda em 15%, o funil era este — histórico, não o estado da noite:

| Loja | Produtos na vitrine | Passaram no filtro de título | Em oferta | Aceitos |
| --- | --- | --- | --- | --- |
| `pokemon` | 3 | 3 | 2 | 1 |
| `copag` | 39 | 4 | 4 | 2 |

A vitrine da loja oficial da Pokémon tem poucos produtos na homepage (~3). O catálogo completo (~113) **não é varrido** — ver [estado atual, ScraperAPI](docs/estado-atual.md#listagem-completa-da-loja-via-scraperapi--investigado-não-construído).

O canal volta a postar sozinho quando alguma loja ativa baixar preço, colocar produto novo, ou quando um item já postado cair o bastante para virar repost. Alavancas de volume: [logo abaixo](#o-que-depende-de-uma-decisão-do-eduardo).

### 🔒 Nenhum post sai sem comissão — nem sem foto

O `Format PT-BR Message` publicava com o `permalink` (link cru, sem comissão) quando o
`utm_link` estava vazio. Isso acabou. Hoje o item precisa passar em **duas exigências** para
virar post: link de afiliado reconhecível e `thumbnail` começando com `http`.

| Camada | Onde | O que faz |
| --- | --- | --- |
| 1 | `Fetch Next Pending` | O `WHERE` exige `matt_word=caed1312314`, `matt_tool=96097202` e foto: item impublicável nem entra na disputa, e por isso **não trava a fila** |
| 2 | `Format PT-BR Message` + `Pode Publicar?` | Revalida os dois e desvia o que não passar, marcando em `etapa` qual trava barrou |
| 3 | `Log Nao Publicavel` + `Registrar Pendentes Impublicaveis` | Registram em `promos_erros` (`error_step = 'afiliado'` ou `'foto'`) para nada sumir calado |

Item barrado **fica em `pending` para sempre**, de propósito, e volta a ser publicável assim
que o dado for corrigido. O raciocínio está na
[Decisão 24](docs/historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado)
(afiliado) e na
[Decisão 26](docs/historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila)
(foto).

**O clique de afiliado já foi atribuído.** Em 13/08 o painel mostrou **5 cliques** (conta só
do Eduardo, canal ainda sem audiência). O que ainda falta é **venda/comissão**. A URL está
certa; quem fecha a comissão é o painel registrar a venda.

---

## REGRA DE ESCOPO — só loja oficial, só produto de TCG

**Decisão original do Eduardo em 13/08/2026**, e ela ainda vem antes de qualquer outra regra:

> "Vamos colocar uma regra antes de tudo. Agora, desde o início, só vamos pegar promoções
> que aparecem dentro da loja oficial da Pokémon. No futuro veremos como misturar e incluir
> outras lojas do mesmo nicho. Mas por enquanto, só da loja Pokémon."

Loja-mãe: <https://www.mercadolivre.com.br/loja/pokemon>

O que isso implica na prática **hoje** (noite de 13/08):

- A **página geral de ofertas** (`ofertas?category=MLB6899`) **saiu de escopo**. Era a fonte
  do `Pokemon Scanner v2`, que por isso está **desativado** — preservado inteiro para uso
  futuro, não apagado.
- O scanner ativo é o **`Pokemon Store Scanner`**, que varre lojas oficiais cadastradas em
  `lojas_confiaveis` com `ativa = TRUE`.
- **Nove lojas ativas:** `pokemon`, `copag`, `brinkjr`, `attack-toys`, `cade-meu-jogo`,
  `psz3d`, `ilusoes-industriais`, `parolar`, `escala-miniaturas`. A COPAG entrou no mesmo dia
  ([Decisão 21](docs/historico-de-decisoes.md#decisão-21--a-copag-entra-no-escopo-por-ser-o-vendedor-de-dentro-da-loja-oficial)); as outras, à noite, para volume com TCG lacrado
  ([Decisão 29](docs/historico-de-decisoes.md#decisão-29--volume-do-canal-5-de-desconto-teto-40-e-alerta-acima-de-40)). Qualquer loja além dessas nove depende de decisão nova.
- **Filtro de título (Regra 0b):** exige vocabulário de TCG e a palavra Pokémon; barra Funko,
  pelúcia, caneca, etc. A Escala Miniaturas usa um filtro **mais apertado** (só lacrado),
  porque a vitrine mistura carta avulsa.
- **Por que a COPAG não afrouxa o critério:** a loja oficial da Pokémon é *multiseller*, e a
  COPAG é o vendedor real de vários itens dentro dela — os cards trazem "COPAG por Pokémon".

O motivo da origem: na página geral de ofertas não existe sinal confiável de autenticidade
([P15](docs/troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon)). Dentro de loja oficial cadastrada, a premissa é originalidade.
O Store Scanner **não** aplica o score anti-falsificação do Scanner v2.

---

## Estado atual (13/08/2026, ~22h40 BRT)

**O bot está rodando de ponta a ponta.** Detalhe fino (versões, ScraperAPI, o que falta
decidir) vive em [`docs/estado-atual.md`](docs/estado-atual.md). Aqui vai o quadro para
retomar em 30 segundos.

| Peça | Estado |
| --- | --- |
| Banco PostgreSQL na VPS | Funcionando, 6 tabelas do bot + `lojas_confiaveis` |
| Credencial do banco no n8n | Funcionando, vinculada node a node |
| Bot e canal do Telegram | Funcionando. Posts reais no dia 13/08, todos com link de afiliado (à tarde saíram 4; à noite saíram mais, ex. Attack Toys `message_id` 23) |
| **Pokemon Store Scanner** | **Ativo**, 9 lojas, a cada **5 min**, publicado `2f6fa3c8` (repost por queda de preço) |
| **Pokemon Publisher v2** | **Ativo**, a cada **2 min**, 8h–22h BRT, teto 40/dia + 4/hora, ordem qualidade, publicado `a621b8c9` |
| **Pokemon Health Alert** | **Ativo**, 21h BRT + manual, publicado `b5e4b758` |
| **Pokemon Scanner v2** | **Desativado de propósito**, preservado inteiro |
| **Pokemon Schema Setup v2** | Desativado (só sob demanda) |
| **TMP Pokemon SQL Console 2** | Ativo só para consulta à mão; cron dummy em 29/fev. Não faz parte do bot |
| Backup dos workflows | Em [`backups/2026-08-13/`](backups/) — **atrasado** em relação ao ritmo 5 min / 2 min; o n8n vale |
| Filtro de autenticidade | Pronto no Scanner v2, **não roda** no Store Scanner |
| Lista de bloqueio de vendedores | Tabela existe; o Store Scanner **não** a consulta |
| Idioma da carta no post | Exibido com confiança ≥ 0,85; Publisher detecta de novo se o banco vier vazio |
| Cupons | Mecanismo pronto. `BRINQUEDOS` **desligado** em 13/08 noite ([Decisão 36](docs/historico-de-decisoes.md#decisão-36--desligar-brinquedos-não-dá-para-saber-qual-item-aceita)): lista de produtos selecionados é busca com anti-bot, e o blister de teste não aceitava o código |
| Repost por queda de preço | Ligado no Store Scanner ([Decisão 33](docs/historico-de-decisoes.md#decisão-33--repostar-se-o-preço-da-vitrine-cair-depois-do-post)) |

### A fila (última conferência documentada)

Números da **tarde** (18h30). À noite a fila voltou a encher e esvaziar com as lojas novas;
a varredura das ~22h10 não aceitou item novo.

| Status | Quantos (18h30) | O que significa |
| --- | --- | --- |
| `posted` | 4 (depois subiu) | Publicados no canal, com link de afiliado |
| `pending` | 0 na última varredura da noite | Sem oferta nova que passe no filtro + 10%/15% |
| `review` | 0 | Zerada em 13/08 — vinham da busca geral, fora de escopo |
| `blocked` | 3 | Falsificação da época da busca geral |
| `descartado` | 6 | Fora de escopo, duplicatas e os 4 antigos de `review` |

Erro conhecido da madrugada: **1** `error_step = 'busca'` às 5h11 (vitrine vazia com HTTP
200). Não se repetiu nas varreduras da noite. **Zero** erros de afiliado ou de foto na
trilha de publicação.

### O que ainda merece atenção

1. **A loja oficial da Pokémon tem pouquíssimo produto na vitrine.** São ~3 na homepage.
   O catálogo completo (~113) foi comprovado via ScraperAPI e **não foi construído**.
2. **O filtro de título faz o trabalho certo e por isso o volume some.** COPAG e BrinkJr
   vendem muito produto que não é Pokémon TCG. Para desligar uma loja:
   `UPDATE lojas_confiaveis SET ativa = FALSE WHERE slug = 'copag';`
   ([runbook, seção 13](docs/runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar)).
3. **O `Pokemon Store Scanner` não passa pelo filtro de autenticidade** do Scanner v2. A
   premissa é que dentro de uma loja oficial não há falsificação — mas a lista de bloqueio
   de vendedores e o score **não** estão protegendo a fila hoje.
4. **Duplicata de produto tem tratamento próprio**, inclusive entre lojas, e **repost** se
   o mesmo `item_id` já postado cair de preço. Detalhes em
   [arquitetura, seção 4b](docs/arquitetura.md#4b-o-pokemon-store-scanner--o-scanner-ativo).
5. ~~**O filtro de título deixa passar produto que não é carta.**~~ **Resolvido.** O Funko
   passou porque a loja oficial estava com `filtro_titulo = NULL`. O post **fica no canal**.
6. ~~**Os itens em `review` ainda têm o link de afiliado antigo.**~~ **Resolvido.** Marcados
   como `descartado`.
7. ~~**Item sem foto ainda trava a fila.**~~ **Resolvido** para thumbnail vazio / sem `http`.
   Ainda pode falhar se o Telegram recusar uma URL que *parece* válida.
8. **Backup em `backups/2026-08-13/` não inclui o ritmo 5 min / 2 min, o Health Alert nem o Pacote A.**
   Restaurar da pasta sem republicar do n8n voltaria intervalos velhos, mínimo 5% e fila só por %.
9. **Health Alert manda Telegram por URL HTTP** (token no node, não em credencial). Não
   copie esse token para esta pasta. Trocar para credencial do n8n é melhoria de segurança.

### O que depende de uma decisão do Eduardo

Nada disso é bug, e nenhuma dessas alavancas foi puxada sem ele pedir — todas mudam o escopo
ou o risco do canal.

| Alavanca | O que ganha | O que custa |
| --- | --- | --- |
| **Cadastrar mais lojas oficiais** de TCG lacrado em `lojas_confiaveis` | Mais volume, mantendo a garantia de originalidade | Escolher loja a loja ([runbook, seção 13](docs/runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar)) |
| **Subir Pokémon/COPAG também para 15%** (hoje **10%** nessas duas, 15% nas satélites) | Canal ainda mais seletivo | Ainda menos posts |
| **Baixar Pokémon/COPAG de volta a 5%** (sem mexer nas satélites) | Mais volume nas lojas-mãe | Volta o risco de post “qualquer 5%” |
| **Religar o `Pokemon Scanner v2`** (busca geral do ML) | Muito mais volume | Volta o risco de falsificação ([P15](docs/troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon)) |
| **Construir o Catalog Scanner** (ScraperAPI, ~113 produtos da Pokémon) | Enxerga o catálogo, não só a vitrine | 10 créditos/página com `render=true`; paginação 2 e 3 ainda falharam |
| **Conferir o painel de afiliados** | Prova que a comissão está sendo atribuída | Só o Eduardo tem acesso |

---

## Como esta documentação está organizada

| Arquivo | Para que serve | Quando abrir |
| --- | --- | --- |
| **README.md** (este) | Visão geral, estado atual, início rápido | Sempre primeiro |
| [docs/arquitetura.md](docs/arquitetura.md) | Como as peças se encaixam, diagrama do fluxo, caminho completo de um produto | Para entender o sistema |
| [docs/regras-de-negocio.md](docs/regras-de-negocio.md) | Cada filtro e cada número, com **onde exatamente mudar** | Para ajustar o comportamento do bot |
| [docs/banco-de-dados.md](docs/banco-de-dados.md) | As tabelas, coluna por coluna, e os índices | Para escrever consultas e entender os dados |
| [docs/runbook.md](docs/runbook.md) | O dia a dia: ligar, desligar, cupom, revisão, conferência — com SQL pronto | **É o arquivo que você mais vai usar** |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Sintoma, causa e solução, com os problemas que já aconteceram de verdade | Quando algo parar de funcionar |
| [docs/historico-de-decisoes.md](docs/historico-de-decisoes.md) | O que foi tentado, o que falhou e por quê | Antes de "ter uma ideia" que já foi descartada |
| [docs/roadmap.md](docs/roadmap.md) | O que ficou de fora e o que faria sentido depois | Para planejar a próxima rodada |
| [backups/](backups/) | Cópia datada dos workflows do n8n, com o código dos Code nodes e as consultas SQL separados | Se algo se perder no n8n, ou para comparar o que mudou |

---

## Início rápido para o Eduardo

### Onde tudo mora

- **Painel do n8n:** <https://srv1897392.hstgr.cloud> — é onde o bot vive. Tudo se faz por aqui.
- **Canal do Telegram:** [@promopokemontcg](https://t.me/promopokemontcg) — onde os posts saem.
- **VPS:** Hostinger, servidor `srv1897392.hstgr.cloud`. Roda o n8n e o banco de dados.

### Os workflows

No n8n, um **workflow** é um fluxo de trabalho: uma sequência de caixinhas (chamadas
**nodes**) ligadas por setas, em que cada caixinha faz uma coisa só. Este projeto tem:

| Workflow | ID (o endereço dele) | O que faz | Estado |
| --- | --- | --- | --- |
| **Pokemon Store Scanner** | `PNwaF3BYhj5KA8eY` | Varre as lojas oficiais de `lojas_confiaveis` e grava as ofertas na fila | **Ativo**, a cada **5 minutos** + jitter 0–60s |
| **Pokemon Publisher v2** | `FXNWeT9C7dEA0DUY` | Tira o próximo item da fila e publica no Telegram | **Ativo**, a cada **2 minutos**, das 8h às 22h BRT, teto 40 |
| **Pokemon Health Alert** | `3irgeWFKZGZZrJ5u` | Alerta privado se parser/vitrine/publisher quebrar | **Ativo**, 21h BRT + manual |
| **Pokemon Scanner v2** | `39kdRchYI6CwsbNY` | Lê a página geral de ofertas do ML, classifica por desconto e autenticidade | **Desativado** — fonte fora de escopo desde 13/08/2026 |
| **Pokemon Schema Setup v2** | `F8jVi6NFxeDHfAkb` | Cria as tabelas do banco | Desativado, só sob demanda |
| **TMP Pokemon SQL Console 2** | `Fc7OGlP4ZNiuNIgd` | Consulta SQL à mão | Descartável. Cron dummy 29/fev; pode arquivar |

**Workflows com nome começando por `TMP` ou `TEMP`, ou marcados como `(temporario)`, não
fazem parte do bot.** São descartáveis. O `TMP Pokemon SQL Console 2` está ativo só para
consulta à mão (o agendamento é 29 de fevereiro, de propósito). Pode arquivar sem medo.

Para abrir qualquer um deles direto, cole o ID no fim da URL:
`https://srv1897392.hstgr.cloud/workflow/FXNWeT9C7dEA0DUY`

### As três coisas que você mais vai querer fazer

**1. Desligar o bot** — abrir o `Pokemon Publisher v2` e desligar o botão **Active** (em
algumas versões aparece como **Publish**) no canto superior direito. Desligar o Publisher
para o canal na hora, sem perder nada: a fila continua enchendo e volta a sair quando você
religar. Detalhes em [runbook, seção 1](docs/runbook.md#1-ligar-e-desligar-o-bot).

**2. Cadastrar um cupom** — quando o Mercado Livre anunciar uma campanha, você roda uma
linha de SQL e o cupom passa a aparecer nos posts automaticamente. SQL pronto em
[runbook, seção 3](docs/runbook.md#3-cadastrar-um-cupom).

**3. Bloquear um vendedor** — uma linha de SQL na tabela `vendedores_bloqueados` e o bot
para de aceitar qualquer anúncio daquele nome. SQL pronto em
[runbook, seção 12](docs/runbook.md#12-lista-de-bloqueio-de-vendedores).

### Como rodar SQL sem ser programador

**SQL** é a linguagem de consulta do banco de dados — é como você pergunta ao banco
"o que foi postado hoje?" ou diz "cadastre este cupom".

Você não precisa instalar nada nem saber programar: dá para rodar consultas dentro do
próprio n8n, com um workflow descartável de dois nodes. O passo a passo completo está em
[runbook, seção 2](docs/runbook.md#2-como-rodar-uma-consulta-sql).

> **Cuidado:** esse console executa qualquer comando, inclusive apagar tabela. Cole só o
> que você entendeu. Todas as consultas do runbook são seguras e estão marcadas quando
> alteram algo.

---

## Vocabulário mínimo

Termos que aparecem em toda a documentação, explicados uma vez só:

- **n8n** — a plataforma de automação onde o bot foi construído. Fluxos visuais, quase sem escrever código.
- **node** — uma caixinha dentro de um workflow. Cada node faz uma tarefa (buscar uma página, rodar uma consulta no banco, mandar mensagem no Telegram).
- **Code node** — um node especial que roda um pedacinho de programa em JavaScript. É onde vivem as regras mais complexas do bot.
- **workflow ativo (publish)** — workflow ligado, que dispara sozinho no horário programado. Desativado, ele só roda quando você clica em "Execute workflow".
- **execução** — um disparo do workflow. O n8n guarda o histórico de todas, com o que entrou e saiu de cada node. É o melhor lugar para investigar problema.
- **credencial** — o login guardado dentro do n8n (senha do banco, token do bot do Telegram). Fica salvo criptografado; esta documentação cita só o **nome** e o **ID**, nunca o valor.
- **scraping** — ler o conteúdo de uma página da internet e extrair dados dela. É assim que o bot pega as ofertas, porque a API oficial do Mercado Livre está fechada.
- **API** — uma porta de entrada oficial de um site para programas consultarem dados. A do Mercado Livre foi descartada; veja o [histórico de decisões](docs/historico-de-decisoes.md).
- **fila (`pending`)** — produtos já aprovados e gravados no banco, esperando a vez de serem publicados.
- **BRT** — horário de Brasília, o fuso usado em todas as regras de horário do bot.
- **centavos** — todos os preços no banco são números inteiros em centavos (R$ 38,29 é gravado como `3829`), para nunca haver erro de arredondamento.

---

## Regras de segurança desta pasta

- **Nunca escreva senha, token ou chave nesta documentação.** Cite o nome e o ID da
  credencial no n8n; o valor fica só lá dentro. As credenciais deste projeto são
  "Pokemon Promos DB" (`6jdqiaTfNIJseSqb`) para o banco e "Pokemon Telegram Bot"
  (`jhasZWps6SfFVWaF`) para o Telegram do canal. O Health Alert usa **outro** bot, o mesmo
  do alerta LinkedIn — o token **não** deve ser colado aqui.
- **O banco não está exposto na internet.** A porta 5432 do container está publicada
  apenas em `127.0.0.1`, dentro da própria VPS. O acesso é sempre por dentro do n8n.
- O ID de afiliado (`caed1312314`) **não é secreto** — ele aparece no link de todo post
  público do canal, então pode ficar documentado à vontade.
