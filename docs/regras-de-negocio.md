# Regras de negócio

Cada regra que o bot aplica, com o **valor que está valendo hoje**, **onde exatamente
mudar** e **o raciocínio** por trás dela.

> **Leia isto antes de mudar qualquer coisa:** as variáveis de ambiente no docker-compose
> do n8n (`ML_MIN_DISCOUNT`, `DAILY_POST_LIMIT` e companhia) são **decorativas**. Nenhum
> node as lê. Isso acontece porque esta instalação do n8n tem `$env` bloqueado — veja
> [a explicação completa](#por-que-tudo-está-fixo-no-código-e-não-em-variáveis-de-ambiente).
> Mexer nelas não muda nada no comportamento do bot. Os valores de verdade estão onde esta
> tabela indica.

---

## Regra 0 — só a loja oficial da Pokémon

**Decisão do Eduardo em 13/08/2026, e ela vem antes de todas as outras regras deste
arquivo.** Só entram no canal promoções que aparecem dentro de
<https://www.mercadolivre.com.br/loja/pokemon>.

Consequências:

- O `Pokemon Scanner v2`, que lê a página geral de ofertas, ficou **desativado**. Todas as
  regras descritas abaixo continuam implementadas e corretas nele, mas não estão rodando.
- Quem alimenta a fila hoje é o `Pokemon Store Scanner`, que varre as lojas cadastradas em
  `lojas_confiaveis`.
- Loja cadastrada não é o mesmo que loja em escopo. Hoje **nove** lojas estão ativas:
  `pokemon`, `copag`, `brinkjr`, `attack-toys`, `cade-meu-jogo`, `psz3d`,
  `ilusoes-industriais`, `parolar` e `escala-miniaturas`. Qualquer loja além dessas
  precisa de decisão nova do Eduardo. Quem manda de verdade é a coluna `ativa` da tabela
  `lojas_confiaveis`; como ligar ou segurar uma loja está no
  [runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar).

O motivo é que dentro da loja oficial da marca o problema de autenticidade desaparece na
origem — tudo que está lá é original. Fora dela, não existe sinal confiável de autenticidade
que dê para automatizar, como mostrou a investigação do selo "Loja oficial"
([P15 no troubleshooting](troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon)).

---

## Regra 0b — só produto de TCG, não qualquer produto Pokémon

**Decisão do Eduardo em 13/08/2026, à tarde**, depois que um **Funko Pop do Slowpoke** foi
publicado no canal: *"apertar o filtro de título para aceitar só produto de TCG daqui pra
frente"*. O canal se chama Promo Pokémon **TCG** — boneco, pelúcia e caneca não pertencem
a ele, mesmo tendo "Pokémon" no nome.

**Onde mora:** coluna `filtro_titulo` da tabela `lojas_confiaveis`, **uma linha por loja**.
Não é código: é dado. Mudar o filtro é um `UPDATE`, não um deploy.

**Como o Scanner aplica** (`Extrair Ofertas das Lojas`):

```js
reFiltro = new RegExp(filtro_titulo, 'i');
passa = reFiltro.test(titulo) || reFiltro.test(norm(titulo));
```

Repare no **ou**: o teste roda no título original *e* no título normalizado (sem acento,
minúsculo, sem pontuação). Isso tem uma consequência que já quase causou um furo: **um termo
de exclusão que só case na forma acentuada não barra nada**, porque o item escapa pela forma
sem acento. Por isso todo termo acentuado do filtro é escrito com classe — `pel[uú]cia`,
`cole[cç][aã]o`, `[aá]lbum` — e nunca só `pelúcia`.

**O filtro em produção desde 14/08/2026** ([Decisão 37](historico-de-decisoes.md#decisão-37--cartas-pokémon-no-plural-e-acessórios-de-tcg-com-pokémon-no-título)):
produto de carta Pokémon **e** acessório de TCG (sleeve, playmat, binder, deck box,
toploader, porta-cartas), **sempre com a palavra Pokémon no título**. Funko, lote avulso,
kit e marca genérica sem Pokémon continuam fora.

Oito lojas (todas menos a Escala) usam `\bcartas\b` no **plural**, para pegar coleção/
baralho e **não** a carta avulsa "Carta Pokémon Nymble 9/94". A Escala Miniaturas **não**
tem `\bcartas\b`: a vitrine mistura single, e o filtro dela já era mais apertado.

Filtro das 8 lojas (trecho positivo extra vs. 13/08: `cartas` plural, `baralho`, `tcg`,
sleeves, playmat, binder, deck box, toploader, capas para cartas, tapete de jogo):

```
^(?!.*(?:funko|\bpop\b|pel[uú]cia|bonec[oa]s?|action figure|\bfigures?\b|chaveiro|caneca|camiseta|moletom|mochila|quebra[ -]?cabe[cç]as?|[aá]lbum de figurinhas|figurinhas?|fantasia|pijama|almofada|adesivos?|sticker|mouse ?pad|lumin[aá]ria|rel[oó]gio|lancheira|squeeze|garrafa|toalha|meias?|\bkits?\b|\blotes?\b|avuls[ao]s?|sem repetir|sortidas?|aleat[oó]ri|\bdados?\b|moedas?))(?=.*pok[eé]mon)(?=.*(?:booster|\bbox\b|\bdecks?\b|blister|display|expans[aã]o|cole[cç][aã]o|elite trainer|\betb\b|\blatas?\b|\btins?\b|\bpacks?\b|bundle|trading card|\btcg\b|\bcartas\b|baralho|lacrad[oa]s?|selad[oa]s?|\bsleeves?\b|playmat|fich[aá]rio|\bbinder\b|porta[ -]?cartas?|deck ?box|toploader|top loader|protetor(?:es)? de cartas?|capas? para cartas?|tapete de jogo))
```

São três exigências ao mesmo tempo, e o título precisa cumprir **as três**:

| Parte | O que faz | Por que |
| --- | --- | --- |
| `(?!.*(?:funko\|...))` | **Barra** licenciado (Funko) e lote/avulso/kit | Um Funko tem "Pokémon" no nome; "Kit 100 Cartas" não é produto lacrado |
| `(?=.*pok[eé]mon)` | **Exige** a palavra Pokémon | Sem isso entra playmat Lorcana, sleeve Dragon Shield e Truco da COPAG |
| `(?=.*(?:cartas\|booster\|sleeve\|playmat\|...))` | **Exige** vocabulário de TCG **ou** acessório | Carta/box/deck **e** sleeve/binder/playmat, desde que Pokémon esteja no título |

**As duas primeiras exigências se cobrem.** O Funko é barrado duas vezes: por conter "funko"
e por não ter vocabulário de TCG. Isso é de propósito — a lista de exclusão nunca vai
prever todo produto licenciado que a Pokémon lança.

**O que se perde:** produto de TCG cujo título não escreva "Pokémon" — algo como
"Elite Trainer Box Fenda Paradoxal" sozinho. Foi uma troca consciente: nos **13 títulos que o
bot já coletou**, todos escrevem Pokémon, e sem essa exigência a vitrine da COPAG entraria
inteira no canal.

**Antes de mexer, teste.** A regex é aplicada a texto de verdade e um parêntese fora do lugar
derruba a varredura inteira (o Scanner aborta a loja de propósito quando o `filtro_titulo` é
inválido, para não deixar passar produto fora do tema). O passo a passo do teste está no
[runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar).

---

## Mapa rápido: onde mora cada parâmetro

> **Atenção à coluna "Workflow".** Onde está escrito só **"Scanner"**, leia
> **`Pokemon Scanner v2`** — que hoje está **desativado** pela Regra 0. Quem alimenta a fila é
> o `Pokemon Store Scanner`, e nele os limites **não são constantes no código**: desconto
> mínimo, preço mínimo, preço máximo e filtro de título vêm de cada linha da tabela
> `lojas_confiaveis` ([runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar)).
> As duas linhas do link de afiliado, essas sim, valem para os dois scanners.

| Regra | Valor hoje | Workflow | Node | O que procurar |
| --- | --- | --- | --- | --- |
| Desconto mínimo | **10%** em `pokemon` e `copag`; **15%** nas outras 7 lojas ([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)) / 15% no Scanner v2 inativo | Store Scanner (dado) e Scanner v2 (código) | tabela `lojas_confiaveis.desconto_minimo` / `Normalize and Classify` | `UPDATE lojas_confiaveis SET desconto_minimo = 10 WHERE slug IN ('pokemon','copag');` — **não** mexer em `const ML_MAX = 60` |
| Desconto máximo (anti-golpe) | 60% | Scanner | `Normalize and Classify` | linha `const ML_MAX = 60;` |
| Limite de bloqueio por autenticidade | −40 | Scanner | `Normalize and Classify` | linha `const AUTH_BLOCK = -40;` |
| Limite de aprovação por autenticidade | +25 | Scanner | `Normalize and Classify` | linha `const AUTH_ACCEPT = 25;` |
| Teto dos sinais positivos de título | 55 | Scanner | `Normalize and Classify` | linha `const POS_KW_CAP = 55;` |
| Apelido de afiliado | `caed1312314` | Store Scanner e Scanner v2 | `Extrair Ofertas das Lojas` / `Normalize and Classify` | linha `const AFILIADO_APELIDO = ...` |
| ID da etiqueta de afiliado | `96097202` | Store Scanner e Scanner v2 | `Extrair Ofertas das Lojas` / `Normalize and Classify` | linha `const AFILIADO_TOOL_ID = ...` |
| Categoria do Mercado Livre | `MLB6899` | Scanner | `Search MercadoLivre` | campo **URL** do node |
| Categoria (cópia usada no banco) | `MLB6899` | Scanner | `Normalize and Classify` | linhas `const CATEGORY` e `const SEARCH_TERM` |
| Intervalo da varredura | **5 minutos** | Store Scanner | `A Cada 5 Minutos` | campo **Minutes Interval**. Não baixar para 2 min (9 HTTP/ciclo) |
| Espera aleatória antes de acessar o ML | 0 a 60 segundos | Store Scanner | `Jitter Aleatorio` | campo **Amount**: `{{ Math.floor(Math.random() * 61) }}` |
| Intervalo da publicação | **2 minutos** | Publisher | `Every 2 Minutes` | campo **Minutes Interval** |
| Janela de postagem | 8h às 22h BRT | Publisher | `Within 8h-22h BRT?` | os dois valores de comparação: `8` e `22` |
| Teto diário de posts | **40** | Publisher | `Under Daily Limit?` | valor de comparação `40` |
| Posts por execução | 1 | Publisher | `Fetch Next Pending` | `LIMIT 1` na consulta |
| Ordem da fila | `pokemon`, depois `copag`, depois economia em R$, depois % | Publisher | `Fetch Next Pending` | `ORDER BY CASE search_term …, economia DESC, discount_pct DESC` |
| Teto por hora | **6** posts na última hora corrida | Publisher | `Under Hourly Limit?` | valor de comparação `6`; o `hour_count` vem do `Count Today Posts` |
| Canal do Telegram | `@promopokemontcg` | Publisher | `Post to Telegram` | campo **Chat ID** |
| Texto do botão de compra | 🛒 Comprar no Mercado Livre | Publisher | `Post to Telegram` | dentro de **Reply Markup → Inline Keyboard** |
| Layout do post | limpo (sem 🃏); **SUPER OFERTA · X% OFF** se `discount_pct > 40` | Publisher | `Format PT-BR Message` | a função `build(t)` e a flag `superOferta` |
| Filtro de título (só TCG) | regex da [Regra 0b](#regra-0b--só-produto-de-tcg-não-qualquer-produto-pokémon) | Store Scanner | — (é **dado**, não código) | coluna `filtro_titulo` de `lojas_confiaveis`, uma linha por loja |

**Como mexer, na prática:** abra <https://srv1897392.hstgr.cloud>, abra o workflow, dê
dois cliques no node indicado, altere o valor, feche o node, clique em **Save** e depois em
**Publish**. Salvar **não** coloca a mudança no agendamento
([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

> Sempre que mudar um Code node, rode o workflow uma vez na mão antes de confiar nele.
> Um erro de digitação em JavaScript só aparece na hora de executar.

---

## 1. Faixa de desconto aceita: 10%/15% no Store Scanner; 15% a 60% no Scanner v2

**Onde:** Store Scanner lê `lojas_confiaveis.desconto_minimo`. Scanner v2 (inativo) usa
`Normalize and Classify` → `const ML_MIN = 15;` e `const ML_MAX = 60;`.

**O que faz (Store Scanner, vigente):**

- Abaixo do mínimo da loja → produto `descartado`. Não entra em `promos`; só em `promos_log`.
- No mínimo da loja ou acima → entra na fila (`pending`), se passar no filtro de título.
- O teto de 60% **não** está no Store Scanner; só no Scanner v2.

**O que faz (Scanner v2, desligado):**

- Desconto **abaixo de 15%** → produto `descartado`. Não é gravado em `promos`; só fica
  registrado em `promos_log`.
- Desconto **entre 15% e 60%** → segue para a avaliação de autenticidade.
- Desconto **acima de 60%** → `bloqueado`, gravado em `promos` com `status = 'blocked'` e
  um `blocked_reason` explicando.

**O porquê do mínimo de 15%:** um canal de promoções que posta "8% de desconto" perde a
confiança do assinante. O mínimo é um filtro de ruído — só entra o que realmente vale a
pena olhar.

**Pacote A vigente (13/08/2026 ~22h35, Decisão 35):** o Store Scanner usa
`lojas_confiaveis.desconto_minimo`. **10%** em `pokemon` e `copag`; **15%** nas outras sete.
O experimento de 5% em todas (Decisão 29) acabou: o clique de afiliado já foi provado.
Para voltar tudo a 15%: `UPDATE lojas_confiaveis SET desconto_minimo = 15 WHERE ativa = TRUE;`
— SQL também no [runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar).

**O porquê do máximo de 60%:** desconto muito alto em carta Pokémon quase nunca é
promoção; é anúncio com preço "de" inflado artificialmente, produto errado, ou golpe. O
teto protege o canal de recomendar armadilha. E o produto **não é descartado**: fica
guardado no banco como `blocked` com o motivo, para você poder auditar depois se o corte
está no lugar certo.

**Como calibrar:** rode a consulta da [seção 7 do runbook](runbook.md#7-calibrar-os-filtros-olhando-os-dados)
para ver a distribuição real de descontos e quantos produtos cada faixa está pegando.

---

## 2. Filtro de autenticidade (anti-falsificação)

Esta é a regra mais elaborada do bot, e a mais importante para a credibilidade do canal.

**Onde:** Scanner → `Normalize and Classify` → função `authenticity(...)`

### Por que existe

No teste de ponta a ponta, o bot publicou no canal um **"Kit 5 Cartas Pokémon Ultra Raras
Japonesas - Brilhantes Ex V"** por R$ 38,29. Lote de cartas "ultra raras brilhantes
japonesas" a preço baixo é o padrão clássico de réplica chinesa vendida no Mercado Livre.

O Eduardo foi explícito: *"não quero fazer com cartas falsas, materiais falsos"*. O filtro
antigo só olhava desconto e não tinha como perceber isso. Daí o filtro de autenticidade.

### Como funciona: um score, não uma lista de bloqueio

O bot **não** usa uma lista simples de palavras proibidas. Título de anúncio é ruidoso, e
uma lista binária erraria muito nos dois sentidos. Em vez disso, cada produto recebe uma
**pontuação** que soma sinais a favor e contra, e o destino depende da faixa em que a
pontuação cai:

| Score | Nível | Destino |
| --- | --- | --- |
| ≤ **−40** | `suspeito` | `bloqueado` — vai para `promos` com `status='blocked'`, nunca ao canal |
| entre −40 e +25 | `duvidoso` | `revisao` — vai para `promos_review`, para você decidir |
| ≥ **+25** | `confiavel` | `aceito` — entra na fila de publicação |

**O princípio por trás disso: na dúvida, não posta.** Credibilidade do canal vale mais que
volume de posts. É exatamente para isso que existe a tabela `promos_review`.

### Sinais que pesam contra

**Termos em que o próprio anúncio admite não ser produto oficial — penalidade −150.**
Basta um para o produto ser praticamente condenado (só um score positivo altíssimo
salvaria, o que não acontece na prática). A lista está na constante `HARD_FAKE`:

`réplica`, `proxy`, `orica`, `fan made`, `custom` / `customizada`, `personalizada`,
`artesanal`, `handmade`, `não oficial` / `não licenciado` / `não original` /
`não autêntico`, `sem licença`, `genérica`, `inspirado em`, `similar`,
`estilo pokemon`, `imitação`, `cópia`, `versão alternativa`, `impressão própria` /
`impressão caseira`, `feito à mão`, `DIY`, `não é original`, `paper card`.

> "Orica" quer dizer *Original Character Illustration Card* — carta feita por fã, comum no
> mercado de cartas e legítima como arte, mas não é produto oficial e não pode ir para um
> canal de promoções de produto original.

**Cartas "gold", "douradas" ou "metalizadas" — penalidade −30.** Não existe linha oficial
de Pokémon TCG vendida a granel no Brasil nesses formatos; é quase sempre réplica. A lista
está em `METAL_FAKE`: `gold`, `dourada`, `metalizada`, `metálica`, `prateada`, `banhada`,
`carta de metal`, `metal card`. Essa penalidade só vale se o título indicar que é carta
(contém `carta`, `card` ou `pokemon`), para não punir, por exemplo, uma pasta dourada.

**Lote grande — penalidade proporcional à quantidade.** O código detecta quantidade no
título por padrões como "kit 5 cartas", "lote 20 cartas", "100 cartas", "50 peças":

| Quantidade declarada | Penalidade |
| --- | --- |
| 100 ou mais | −40 |
| 50 a 99 | −30 |
| 30 a 49 | −25 |
| 10 a 29 | −12 |
| 5 a 9 | −5 |
| 2 a 4 | −3 |

**Chamariz de raridade em lote — até −45.** Palavras de raridade só contam contra quando
aparecem junto com quantidade (lote), porque uma carta rara vendida sozinha pode
perfeitamente ser real. Raridade "alta" (`ultra rara`, `hiper rara`, `secreta`,
`secret rare`, `rainbow`, `arco iris`, `shiny`) pesa 25; raridade "média" (`brilhante`,
`holográfica`, `holo`, `cromada`) pesa 15. Quando há mais de um termo, soma 10 por termo
extra, com teto de 45.

**Lote grande de cartas japonesas com preço implausível — penalidade −25.** As réplicas mais
comuns imitam cartas japonesas, justamente porque o comprador brasileiro tem menos referência
para comparar. Mas a penalidade **não vale pelo idioma sozinho**: carta japonesa legítima
existe e é valorizada por colecionador. Desde 13/08/2026 ela só entra quando três coisas
acontecem ao mesmo tempo: idioma detectado como japonês, **10 ou mais unidades** no lote e
preço unitário **abaixo de R$ 5**. É a combinação que denuncia, não a língua.

**Preço por carta implausível.** Quando dá para inferir quantidade, o código calcula o
preço unitário:

- Carta anunciada como raridade alta (ou metalizada) saindo por **menos de R$ 15** a
  unidade → **−35**. Carta ultra rara autêntica não custa isso.
- Preço unitário **abaixo de R$ 1** → **−10**. É volume sem valor de coleção.

**Vendedor.** Sem reputação publicada: −6. Nota abaixo de 4,0: −12. Menos de 100 vendas
registradas: −10.

### Sinais que pesam a favor

Somados, mas com **teto de 55** (a constante `POS_KW_CAP`). O teto existe porque **vendedor
de produto falsificado também escreve "original" e "oficial" no anúncio** — sem o teto,
seria fácil um anúncio falso empilhar palavras bonitas e furar o filtro.

| Sinal no título | Peso | Por quê |
| --- | --- | --- |
| `Copag` | **+45** | A Copag é a distribuidora e impressora licenciada oficial do Pokémon TCG no Brasil. É o sinal mais forte de originalidade que existe |
| `lacrado`, `selado`, `lacre` | +25 | Produto lacrado de fábrica é muito difícil de falsificar de forma convincente |
| `booster box`, `booster pack`, `blister`, `elite trainer box`, `ETB`, `trainer box`, `coleção especial`, `premium collection`, `lata`, `tin`, `deck`, `baralho` | +25 | São nomes de linhas de produto seladas que só existem oficialmente |
| `português`, `nacional`, `pt-br` | +12 | Versão nacional passa pela Copag |
| `NM`, `near mint`, `mint`, `PSA`, `BGS`, `CGC` | +8 | Vocabulário de colecionador sério e de casas de gradação |
| `nota fiscal`, `NF-e` | +5 | Vendedor formalizado |

**Vendedor:** nota 4,8 ou mais: +10. Nota entre 4,5 e 4,8: +5. Mais de 1000 vendas: +10.
Entre 500 e 1000: +6. Entre 100 e 500: +3.

> **Nada autodeclarado soma ponto — corrigido em 13/08/2026.** Até essa data, `original`,
> `oficial`, `licenciado` e `autêntico` valiam +15, e `selo` valia +8. Era um bug: esses são
> exatamente os termos que o falsificador escreve. O mesmo vale para o campo de marca e para
> o selo "Loja oficial" do Mercado Livre, que nunca chegaram a pontuar e não devem chegar.
> A regra hoje é simples: **só conta a favor o que o vendedor não escolhe** — reputação,
> volume de vendas — e nomes de linha de produto selada, que são difíceis de forjar de forma
> convincente. Contexto completo em
> [P15 no troubleshooting](troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon).

### Lista de bloqueio de vendedores

Antes de qualquer pontuação, o Scanner extrai o nome do vendedor do card (componente
`seller`) e confere contra a tabela `vendedores_bloqueados`. Se bater, o produto é bloqueado
na hora, com o motivo registrado, sem passar pelo score.

A comparação ignora maiúsculas e acentos. A cobertura é baixa — só ~3% dos anúncios expõem o
vendedor — mas quando aparece é sinal forte.

**É lista de bloqueio apenas, nunca de aprovação.** Não estar na lista não significa nada,
porque na maioria dos anúncios o nome nem aparece.

Para adicionar ou remover nomes:
[runbook, seção 12](runbook.md#12-lista-de-bloqueio-de-vendedores).

### O score final

```
score = (sinais positivos de título, com teto de 55)
      + (sinais do vendedor)
      + (todas as penalidades)
```

O motivo completo da classificação é gravado em texto legível, tanto em `promos_log.reason`
como em `promos.blocked_reason`, no formato
`autenticidade +37 (confiavel) - contra: lote de 5 cartas | a favor: produto lacrado; ...`.
É isso que permite calibrar o filtro depois olhando casos reais.

### Como calibrar

O caminho recomendado é **não mexer nos pesos no começo**. Deixe rodar alguns dias, olhe a
tabela `promos_review` e faça a pergunta certa em cada caso:

- Item legítimo caindo em `revisao`? O limite `AUTH_ACCEPT` (+25) pode estar alto, ou falta
  um sinal positivo na lista.
- Item claramente falso caindo em `revisao` em vez de bloqueado? O limite `AUTH_BLOCK`
  (−40) pode estar frouxo, ou falta um termo em `HARD_FAKE`.
- Item legítimo sendo **bloqueado**? Isso é o pior caso; provavelmente uma penalidade de
  lote está pesada demais para o seu nicho.

Consultas prontas: [runbook, seção 4](runbook.md#4-revisar-a-fila-de-revisão-humana) e
[seção 7](runbook.md#7-calibrar-os-filtros-olhando-os-dados).

---

## 3. Deduplicação: cada produto só uma vez — com exceção de queda de preço

**Onde:** Store Scanner → `Inserir Promo da Loja` (`ON CONFLICT`) e `Extrair Ofertas das
Lojas` (dedup por catálogo / título). O Scanner v2 antigo continua `DO NOTHING`. Além do
`NOT EXISTS` na consulta do node `Queue Review`.

**Como funciona no caso normal:** a coluna `item_id` da tabela `promos` é **única**. Quando
o Scanner tenta gravar um produto que já está lá **sem** queda relevante, o banco ignora,
sem erro. O node de log grava `duplicado` em vez de `aceito`.

**Exceção (Decisão 33, 13/08 noite):** item **já postado** cujo preço **público da vitrine**
(polycard, nunca checkout logado) ficou menor que `promos.price_cents` volta para a fila.

Condições, todas obrigatórias:

1. `status = 'posted'`
2. preço novo **menor** que o gravado
3. queda ≥ **5%** **ou** ≥ **R$ 5**
4. no máximo **1** `repost` desse `item_id` nas últimas 24h
5. ainda passa no desconto mínimo da loja (no parser, antes do `INSERT`)
6. `utm_link` com os dois parâmetros de afiliado e thumbnail começando com `http`

Aí o `ON CONFLICT` faz `UPDATE`: preço, desconto, utm, thumb, `status = 'pending'`, e
limpa `posted_at` / `telegram_message_id`. O log grava `decision = 'repost'` com
`R$ antigo -> R$ novo`. O Publisher não precisa mudar — já publica qualquer `pending`
publicável.

Isso vale para o **mesmo `item_id`**. Se a vitrine mostrar o mesmo produto em outra ficha
(`item_id` diferente, mesmo catálogo), o parser continua tratando como duplicata.

**O que continua valendo:** item `blocked` / `review` / `descartado` **não** ganha segunda
chance só porque o preço caiu. Para reavaliar esses, o caminho continua sendo apagar a
linha. SQL em [runbook, seção 9](runbook.md#9-liberar-um-produto-para-ser-reavaliado).

---

## 4. Janela de postagem: 8h às 22h BRT

**Onde:** Publisher → `Within 8h-22h BRT?` → duas condições, `≥ 8` e `< 22`

**O que faz:** a hora atual é calculada explicitamente no fuso `America/Sao_Paulo`
(`$now.setZone("America/Sao_Paulo").hour`), justamente para não depender de como o servidor
está configurado. Fora da janela o fluxo termina em `Outside Posting Window` e **nada se
perde** — a fila fica parada e a publicação retoma na manhã seguinte.

**O porquê:** canal de promoções que posta às 4 da manhã incomoda e gera silenciamento. A
janela de 14 horas cobre o horário em que as pessoas realmente compram.

**Para mudar:** troque os dois números. Note que a condição de fim é "menor que 22", ou
seja, o último post possível sai às 21h59.

---

## 5. Teto diário: 40 posts

**Onde:** Publisher → `Under Daily Limit?` → valor de comparação `40`

> Este é o parâmetro que engana. O node que **conta** os posts se chama
> `Count Today Posts`, mas o número 40 **não está lá** — está no node de decisão seguinte,
> `Under Daily Limit?`. Se você mudar no lugar errado, nada acontece.

**O que faz:** conta quantos itens têm `status='posted'` com `posted_at` de hoje e só
libera a publicação se for menos de 40.

**O porquê:** proteção contra saturar o canal. Com o Publisher rodando a cada **2 minutos**
dentro de uma janela de 14 horas, o máximo teórico seria de cerca de 420 posts por dia — o
teto de 40 (subido de 30 em 13/08/2026, [Decisão 29](historico-de-decisoes.md#decisão-29--volume-do-canal-5-de-desconto-teto-40-e-alerta-acima-de-40)) é o freio de verdade. O ritmo continua 1 post por disparo.

**Efeito colateral conhecido, agora mitigado:** sem teto por hora, 40 posts cabiam nas
primeiras ~80 minutos. Desde a [Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)
existe também o teto de **6 posts na última hora corrida** (`Under Hourly Limit?`).

Na prática o teto diário de 40 talvez nunca seja alcançado: as nove lojas ativas, com o
corte 10%/15%, rendem poucos itens novos por dia.

---

## 5b. Teto por hora: 6 posts na última hora corrida

**Onde:** Publisher → `Count Today Posts` devolve `hour_count`; o IF `Under Hourly Limit?`
compara com `6`. Se passou, o fluxo termina em `Hourly Limit Reached`.

**O que faz:** conta itens `posted` com `posted_at > now() - interval '1 hour'` (hora
corrida, não relógio cheio). Só busca o próximo `pending` se forem menos de 6.

**O porquê:** com Publisher a cada 2 min, 40 posts cabiam em ~80 minutos da manhã. Seis
por hora espalha o canal ao longo do dia sem atrasar uma oferta boa quando a fila está
vazia. Era 4 ([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume));
em 14/08/2026 o Eduardo subiu para 6 no teste de fim de semana.

**Cuidado:** o número **não** está no `Count Today Posts`. Está no IF seguinte, igual ao
teto diário de 40.

---

## 6. Ritmo: Scanner a cada 5 minutos (com espera aleatória), Publisher a cada 2 minutos

**Onde:** Store Scanner → nodes `A Cada 5 Minutos` e `Jitter Aleatorio`; Publisher → node
`Every 2 Minutes`

**Valores em produção desde a noite de 13/08/2026** ([Decisão 34](historico-de-decisoes.md#decisão-34--ritmo-em-produção-scanner-5-min-publisher-2-min)). Antes: Scanner 10 min, Publisher 5 min.

**O porquê de intervalos diferentes:** o Scanner varre com frequência para as promoções
chegarem rápido à fila — oferta boa de carta Pokémon costuma esgotar em pouco tempo.
Publicar, ao contrário, precisa ser espaçado, para o canal ter ritmo agradável em vez de
despejar tudo de uma vez. Com 9 lojas, 5 minutos no Scanner já são ~288 ciclos/dia × 9
HTTP. **2 minutos no Scanner foi recusado** na descrição do workflow: risco de anti-bot.

**A espera aleatória (`Jitter Aleatorio`).** Entre o relógio e o acesso ao Mercado Livre há um
node do tipo *Wait* que para o fluxo por um tempo sorteado de 0 a 60 segundos
(`Math.floor(Math.random() * 61)`). O motivo é disfarce: acesso pontual como relógio suíço,
sempre em minutos redondos, é fácil de reconhecer como robô. Com o sorteio, a hora de cada
varredura fica irregular.

Duas consequências práticas: o intervalo real entre varreduras passa a variar de ~4 a ~6
minutos, e cada execução do Scanner aparece no histórico do n8n demorando até um minuto a
mais. Nenhuma das duas é problema.

**Cuidado ao diminuir mais.** Se o anti-bot voltar (veja
[troubleshooting](troubleshooting.md)), a primeira coisa a fazer é **aumentar** esse
intervalo, nunca diminuir.

---

## 7. Um post por execução, na ordem de qualidade

**Onde:** Publisher → `Fetch Next Pending` → `ORDER BY` + `LIMIT 1`

**Ordem vigente (Decisão 35):**

1. Loja oficial da marca (`search_term = 'loja:pokemon'`)
2. COPAG (`loja:copag`)
3. Maior economia em reais (`original_price_cents - price_cents`)
4. Maior `discount_pct`

Ainda é **1 item por disparo**. O % sozinho deixava um 18% de R$ 6 sair na frente de um box
oficial com 12% e R$ 80 de economia.

**Efeito colateral conhecido:** se o item do topo da fila **nunca conseguir ser publicado**
(por exemplo, foto inválida que o Telegram recusa), o Publisher vai tentar o mesmo item a
cada 2 minutos indefinidamente e **a fila trava**, porque a consulta sempre escolhe ele de
novo. Como identificar e destravar: [troubleshooting, P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha).

---

## 8. Cupons: manuais de propósito

**Onde:** tabela `cupons` no banco. O Publisher lê no node `Fetch Next Pending`, num
`LEFT JOIN LATERAL`.

**Como o cupom é escolhido (Decisão 39):** entre os cupons `ativo = TRUE`, dentro do prazo,
com preço do item >= `valor_minimo_cents`, **e** com o produto em `cupons_itens` (`item_id`
igual ao anúncio **ou** `catalog_id` no permalink). Ganha o de maior `prioridade`. Cupom
sem linha em `cupons_itens` **não cola em ninguém**.

Cadastro: neste chat, depois que o Eduardo testar o código no anúncio. O post **nunca
calcula preço com cupom** — só mostra código + mínimo + validade.

**Campanha `BRINQUEDOS` (14–16/08/2026):** religada na [Decisão 39](historico-de-decisoes.md#decisão-39--cupom-só-no-produto-testado-e-link-com-wid)
só nos 10 anúncios testados (`cupons_itens`), mínimo R$ 59, até **16/08/2026 23h59 BRT**.
Antes disso tinha sido desligada ([Decisão 36](historico-de-decisoes.md#decisão-36--desligar-brinquedos-não-dá-para-saber-qual-item-aceita))
porque o código não cola em qualquer item.

Se não houver cupom válido, o post sai normalmente, só sem a linha de cupom. **Cupom
vencido nunca vai ao ar**, porque o filtro de data está na própria consulta.

**O porquê de ser manual** — esta é uma das decisões mais importantes do projeto e vale
entender antes de tentar "melhorar":

- O Mercado Livre **não tem API pública nem feed estável de cupons**.
- Os cupons do ML são majoritariamente **por conta de usuário**: a Central de Cupons mostra
  o que está disponível para *aquele* usuário logado. Um código válido para o Eduardo pode
  simplesmente não existir para o assinante do canal.
- O cupom de primeira compra é aplicado automaticamente no checkout e só vale para CPF sem
  histórico.
- Sites agregadores (Cuponomia, Cupomvalido, Pelando) não expõem feed público do ML e mudam
  de layout com frequência. Ferramentas que tentam isso dependem de copiar cookie de
  sessão, que expira.
- Afiliados recebem os cupons digitáveis pelos canais oficiais do ML (grupos de Telegram e
  WhatsApp para criadores) e repostam **na mão**.

**A conclusão:** raspar agregador entregaria, mais cedo ou mais tarde, um cupom vencido ou
inválido no post — que é exatamente o que destrói a credibilidade do canal. Um campo manual
custa uma linha de SQL quando o ML anuncia campanha, e **nunca mente**.

Como cadastrar: [runbook, seção 3](runbook.md#3-cadastrar-um-cupom).

---

## 9. Regras do formato do post

**Onde:** Publisher → `Format PT-BR Message`, função `build(t)`

| Regra | Comportamento | Por quê |
| --- | --- | --- |
| Escape de HTML | `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;` em título e cupom | Com `parse_mode=HTML`, um `&` não escapado derruba o post com erro 400 do Telegram. **Não remova isso** |
| Item sem link de afiliado não publica | O item é pulado e o motivo vai para `promos_erros` (`error_step = 'afiliado'`) | O canal existe para gerar comissão. Post sem código de afiliado entrega tráfego de graça — pior do que post nenhum. Não há fallback para o `permalink` |
| Reputação neutra é omitida | Se nota ≤ 3.0 **e** vendas = 0, a linha do vendedor desaparece | Esse é o valor padrão de "não achei o dado". Exibir "nota 3.0, 0 vendas" passaria desconfiança sem motivo |
| Limite de 1024 caracteres | Se estourar, encurta **o título** e remonta a legenda inteira | É o limite do Telegram para legenda de foto. Cortar no meio poderia partir uma tag HTML e gerar erro 400 |
| Link vai no botão, não no texto | `reply_markup` com botão inline | Fica mais profissional e, de brinde, o `reply_markup` não passa pelo interpretador de HTML — o `&` do link deixou de ser risco |
| Economia em reais | "25% OFF · você economiza R$ 32,10" | Valor absoluto comunica melhor que porcentagem sozinha |
| Sem emoji no título | O título vai só em negrito, sem 🃏 | O coringa é emoji de baralho, não de Pokémon — barateava o post. Pedido do Eduardo em 13/08/2026 |
| Cabeçalho sóbrio | `Pokémon TCG` em negrito, sem 🔥 | Gritaria em todo post cansa. A foto do produto já é o destaque |
| Super oferta (> 40% OFF) | Um bloco só: `SUPER OFERTA · 45% OFF` + economia em negrito | Dois gritos (`SUPER OFERTA` + `ALERTA DE PREÇO`) eram demais. O botão de compra continua o mesmo `buy_link` de afiliado |
| Cupom, se houver | Código em `<code>` (dá para copiar no toque) + descrição · mínimo · validade | Sem cupom `ativo`, a linha some. `BRINQUEDOS` está desligado (Decisão 36) |

**Sem hashtags, por decisão.** O post termina na linha "⏳ Preço e estoque podem mudar".
A linha `#PokemonTCG #CartasPokemon #Promocao` existia no começo e foi
**removida em 12/08/2026**, a pedido do Eduardo: hashtag em canal de Telegram não gera
descoberta como em rede social, então só ocupava espaço. Se algum dia alguém quiser
recolocar, é um `L.push(...)` no fim da função `build(t)` — mas a decisão registrada é não
usar.

---

## 10. Link de afiliado

**Onde:** a função `montarLinkAfiliado`, que existe **igual nos dois scanners** — no
`Extrair Ofertas das Lojas` (Store Scanner) e no `Normalize and Classify` (Scanner v2).

**Formato em produção desde 13/08/2026:**

```
{permalink sem parâmetros}?matt_word=caed1312314&matt_tool=96097202&forceInApp=true
```

| Parâmetro | Valor | O que é |
| --- | --- | --- |
| `matt_word` | `caed1312314` | O **apelido da conta de afiliado** do Eduardo |
| `matt_tool` | `96097202` | O **ID numérico da etiqueta** criada no painel de afiliados |
| `forceInApp` | `true` | Abre o link dentro do app do Mercado Livre quando o celular tem o app instalado, o que preserva melhor a atribuição da comissão |

**Este formato foi corrigido, e a versão anterior estava errada.** Até 13/08/2026 o bot
montava `?matt_tool=caed1312314&matt_word=MLB&matt_source=social` — com o apelido no lugar
da etiqueta e a etiqueta no lugar do apelido. A conferência contra dois links reais gerados
no painel do Eduardo confirmou a inversão. A história completa está na
[Decisão 23 do histórico](historico-de-decisoes.md#decisão-23--o-formato-do-link-de-afiliado-confirmado-e-corrigido).

**O parâmetro `ref` não dá para montar.** O link que o painel gera traz também um
`ref=<token>` assinado pelo servidor do Mercado Livre, e esse token não pode ser produzido
fora do painel. A atribuição funciona sem ele: quem identifica o afiliado é o par
`matt_word` + `matt_tool`.

**Cuidado: existe um segundo formato, e nele o `ref` é obrigatório.** O painel também gera
links como `https://www.mercadolivre.com.br/social/caed1312314?…&ref=<token>` — a página de
**perfil social** do afiliado, que mostra a marca do canal no topo. Ali o `ref` **não é
dispensável: é ele que carrega o produto de destino.** Sem o `ref`, a mesma URL abre a
vitrine genérica do perfil, sem produto nenhum, e indicar o item por `?item_id=MLB…` não
resolve, porque o Mercado Livre ignora esse parâmetro. Ou seja, o parágrafo acima ("a
atribuição funciona sem ele") vale para o **link direto do produto**, que é o que o bot
monta — **não** para o formato social, que por isso é impossível de automatizar. O
diagnóstico completo, com o teste com e sem `ref`, está na
[Decisão 27](historico-de-decisoes.md#decisão-27--o-formato-de-perfil-social-não-substitui-o-link-direto).

O código joga fora qualquer `?parâmetro` que já venha no link original antes de colar o
seu, para não gerar URL com dois pontos de interrogação.

O link é montado **no Scanner** e gravado na coluna `utm_link` da tabela `promos`. O
Publisher só usa o que está gravado — e isso tem uma consequência prática importante:
**mudar o formato não conserta o que já está na fila.** Os itens gravados antes da mudança
continuam com o link antigo até serem regravados por `UPDATE`.

Isso já foi origem de dois bugs reais, além da inversão acima:

1. O `utm_link` não estava sendo gravado no `INSERT` — o Publisher nunca tinha o link.
2. O Publisher usava `permalink` em vez de `utm_link` — os posts saíam **sem link de
   afiliado**, e nenhuma comissão seria gerada.

Os dois estão corrigidos.

### As travas de publicação (desde 13/08/2026)

São duas exigências, e o item precisa passar nas duas para virar post:

| Exigência | O que é aceito |
| --- | --- |
| **Link de afiliado** | O `utm_link` contém `matt_word=caed1312314` **e** `matt_tool=96097202` |
| **Foto** | O `thumbnail` começa com `http` |

O antigo fallback para o `permalink` foi **removido** — ele publicava sem comissão, que é
justamente o contrário do propósito do canal
([Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado)). A
exigência de foto veio depois, pelo mesmo desenho
([Decisão 26](historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila)).

A proteção é em três camadas, para que uma falha não dependa da outra:

| Camada | Onde | O que faz |
| --- | --- | --- |
| 1. Não seleciona | `Fetch Next Pending` | O `WHERE` exige os dois parâmetros do afiliado e um `thumbnail` `http`. Item impublicável nunca chega ao topo da fila, então **não trava a fila** ([P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha)) |
| 2. Não formata | `Format PT-BR Message` + `Pode Publicar?` | O Code node só marca `publicavel: true` se link e foto passarem. Reprovado, ele preenche `etapa` com `afiliado` ou `foto`, e o `IF` manda para o log |
| 3. Não some calado | `Log Nao Publicavel` e `Registrar Pendentes Impublicaveis` | Gravam em `promos_erros` com `error_step` igual à `etapa`. O segundo roda em paralelo ao Fetch e denuncia os pendentes que a consulta ignorou |

**Consequência que precisa estar clara:** item reprovado **fica parado em `pending` para
sempre**, e é isso mesmo que se quer. Ele volta a ser publicável assim que o dado for
corrigido — regravando o `utm_link` (SQL em
[P16](troubleshooting.md#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos))
ou o `thumbnail`.

**Se você mudar o formato do link,** mude nos dois scanners **e** nas duas verificações do
Publisher (o `WHERE` do `Fetch Next Pending` e as constantes `AFILIADO_APELIDO` /
`AFILIADO_TOOL_ID` do `Format PT-BR Message`) — senão a trava barra tudo e o canal para de
publicar. Depois confira um post real: clique no botão e veja se o `matt_word=caed1312314`
está na URL.

---

## 11. Idioma da carta no post

**Onde:** detecção no Scanner → `Extrair Ofertas das Lojas` (função `detectarIdioma`);
exibição no Publisher → `Format PT-BR Message` (constantes `IDIOMA_LABEL` e
`IDIOMA_CONF_MIN`). Se o banco vier `desconhecido`, o Publisher detecta de novo no título
na hora de montar o post ([Decisão 31](historico-de-decisoes.md#decisão-31--idioma-volta-a-aparecer-no-post-mesmo-sem-a-palavra-no-título)).

Colecionador se importa com o idioma da carta, então o post mostra essa informação — mas só
quando dá para confiar nela.

**Como é detectado.** O código procura pistas no título normalizado (sem acento, minúsculo)
e devolve um código e uma confiança:

| Situação | Resultado | Confiança |
| --- | --- | --- |
| Uma língua encontrada, e ela é a **última palavra** do título | `pt`, `en`, `ja`, `ko` ou `zh` | 0,97 |
| Uma língua encontrada em qualquer outra posição | idem | 0,85 |
| Sem palavra de idioma, mas nome de produto BR (`treinador avancado`, `deck de batalha`, `mega evolucao`) ou loja `copag`/`pokemon` | `pt` | 0,85 |
| Sem palavra de idioma, mas nome de produto EN (`elite trainer box`, `pitch black`, `mega evolution`) | `en` | 0,85 |
| Duas ou mais línguas / sinais misturados | `ambiguo` | 0,40 |
| Nenhuma pista | `desconhecido` | 0 |

Palavras-chave: português (`portugues`, `copag`, `nacional`, `pt-br`); inglês (`ingles`,
`english`, `eng`, **`ing`** — abreviação comum no Mercado Livre); japonês, coreano, chinês.

O resultado é gravado em `promos.idioma` e `promos.idioma_confianca`.

**Como é exibido.** O Publisher imprime a linha `Idioma: **Português**` (ou Inglês, Japonês,
Coreano, Chinês) quando a confiança é **maior ou igual a 0,85**. Nos casos `ambiguo` e
`desconhecido` a linha **some do post**. A regra é deliberada: errar o idioma de uma carta
é pior para a credibilidade do canal do que não falar nada.

O `Pokemon Store Scanner` também grava essas duas colunas nas ofertas novas. O post não
depende disso: o Publisher detecta de novo se o banco vier vazio.

---

## Por que tudo está fixo no código e não em variáveis de ambiente

A intenção original era guardar todos esses parâmetros em variáveis de ambiente do n8n, num
lugar só, para não precisar caçar valor dentro de código.

**Não funciona nesta instalação.** O n8n está com a configuração
`N8N_BLOCK_ENV_ACCESS_IN_NODE` ativa, que bloqueia o acesso a `$env` em **qualquer**
expressão do n8n — não só em Code nodes. A tentativa retorna o erro
`access to env vars denied`. Isso é uma proteção de segurança do n8n: sem ela, qualquer
workflow poderia ler todos os segredos do servidor.

**A decisão foi manter os valores fixos nos nodes** e documentar bem onde cada um mora —
que é justamente o que a tabela no topo deste arquivo faz.

Consequência prática: as variáveis `ML_MIN_DISCOUNT`, `ML_MAX_DISCOUNT`, `DAILY_POST_LIMIT`,
`POST_WINDOW_START`, `TELEGRAM_CHANNEL_ID` e afins que existem no docker-compose do n8n
**não são lidas por node nenhum**. Elas ficaram como resquício e podem enganar quem chegar
depois. Se algum dia você quiser centralizar de verdade, o caminho é remover
`N8N_BLOCK_ENV_ACCESS_IN_NODE` do docker-compose do n8n e reiniciar o container — mas isso
é uma mudança de segurança do servidor inteiro, não só deste projeto, e deve ser pensada
com calma.
