# Banco de dados

O banco é o coração do bot: é onde vive a fila de publicação, o histórico de decisões e
o diagnóstico de problemas. Os dois workflows não conversam entre si — só pelo banco.

---

## Onde ele está

| Item | Valor |
| --- | --- |
| Servidor | VPS Hostinger `srv1897392.hstgr.cloud` |
| Container Docker | `pokemon-postgres` (imagem `postgres:16-alpine`) |
| Rede Docker | `n8n_default` — a mesma do n8n, obrigatoriamente |
| Banco | `pokemon_promos` |
| Usuário | `pokemon_bot` |
| Porta | 5432, publicada **apenas** em `127.0.0.1` (não acessível pela internet) |
| Volume de dados | `postgres_data` (é o que preserva os dados em reinício) |
| Credencial no n8n | "Pokemon Promos DB", ID `6jdqiaTfNIJseSqb` |

A senha fica **só** dentro da credencial do n8n e da configuração do container. Não está
nesta documentação e não deve estar.

**Como consultar:** pelo console SQL do n8n — veja
[runbook, seção 2](runbook.md#2-como-rodar-uma-consulta-sql).

> **Nota de precisão sobre este documento:** o schema abaixo foi conferido direto no banco
> vivo em 13/08/2026, consultando `information_schema.columns`, `pg_indexes` e
> `pg_constraint`. Colunas, tipos, defaults, índices e restrições de unicidade estão como o
> banco realmente os reporta, e o que está aqui é o mesmo que o `Pokemon Schema Setup v2`
> recria. Para refazer a conferência, a consulta está em
> [runbook, seção 10](runbook.md#10-conferir-o-schema-real-do-banco).

---

## O papel de cada tabela no fluxo

| Tabela | Papel | Quem escreve | Quem lê |
| --- | --- | --- | --- |
| `promos` | **A fila e o histórico principal.** Todo produto que o bot decide guardar mora aqui, com seu status | Scanner (`Insert Promo`, `Insert Blocked`, `Insert Review`) e Publisher (`Mark as Posted`) | Publisher (`Count Today Posts`, `Fetch Next Pending`) |
| `promos_log` | **O diário de bordo.** Uma linha por decisão tomada, sobre qualquer produto, inclusive os descartados que não entram em `promos` | Scanner e Publisher | Você, para auditar e calibrar |
| `promos_erros` | **A fila de erros** (*dead letter queue*) e o alarme de quebra do parser | Scanner e Publisher, nas saídas de erro | Você, para diagnosticar |
| `promos_review` | **A fila de curadoria humana.** Produtos com autenticidade duvidosa esperando sua decisão | Scanner (`Queue Review`) | Você |
| `cupons` | **Cadastro manual de cupons** do Mercado Livre | **Você**, na mão | Publisher (`Fetch Next Pending`) |
| `vendedores_bloqueados` | **Lista de bloqueio por nome de vendedor.** Bloqueio apenas, nunca aprovação | **Você**, na mão | Scanner (`Load Seller Blocklist`) |

Existe ainda a tabela `lojas_confiaveis`, que **não faz parte deste conjunto**: ela é do
`Pokemon Store Scanner` e guarda as lojas oficiais varridas. As operações do dia a dia estão
em [runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar); a estrutura da
tabela está mais abaixo, em [`lojas_confiaveis`](#tabela-lojas_confiaveis--as-lojas-oficiais-varridas).

Uma diferença que confunde: **`promos` guarda produto, `promos_log` guarda decisão.** Um
mesmo produto pode ter várias linhas em `promos_log` (foi aceito na primeira varredura,
`duplicado` nas seguintes, `posted` quando publicado) mas só uma linha em `promos`. E um
produto `descartado` por desconto baixo aparece **só** em `promos_log`, nunca em `promos`.

---

## Tabela `promos`

A tabela central. Serve ao mesmo tempo de fila de publicação e de arquivo histórico.

| Coluna | Tipo | Regra | O que significa |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | chave primária | Número sequencial interno |
| `item_id` | `TEXT` | obrigatório, **único** | O código do produto no Mercado Livre (ex.: `MLB3871315569`). É a chave da deduplicação |
| `title` | `TEXT` | obrigatório | Título do anúncio, cortado em 300 caracteres |
| `price_cents` | `INTEGER` | obrigatório | Preço atual **em centavos** (R$ 38,29 = `3829`) |
| `original_price_cents` | `INTEGER` | opcional | Preço "de", em centavos. Quando não há promoção, vem igual ao atual |
| `discount_pct` | `NUMERIC(5,2)` | opcional | Desconto em porcentagem, com 2 casas decimais (ex.: `41.00`, `15.85`) |
| `seller_reputation` | `NUMERIC(3,1)` | opcional | Nota do vendedor de 0 a 5 (ex.: `4.8`). `3.0` é o valor padrão de "não consegui ler" |
| `seller_sales` | `INTEGER` | padrão `0` | Volume de vendas do vendedor |
| `category_id` | `TEXT` | opcional | Sempre `MLB6899` hoje (Cartas Colecionáveis T.C.G) |
| `thumbnail` | `TEXT` | opcional | URL da imagem usada no post |
| `permalink` | `TEXT` | opcional | Link original do produto, sem o código de afiliado |
| `utm_link` | `TEXT` | opcional | **Link de afiliado**, que é o que vai no botão do post |
| `status` | `TEXT` | obrigatório, padrão `pending` | O estado do produto. Valores na tabela abaixo |
| `blocked_reason` | `TEXT` | opcional | Explicação de por que foi bloqueado ou mandado para revisão |
| `telegram_message_id` | `BIGINT` | opcional | O número da mensagem no canal. Guardado para permitir editar ou apagar o post depois |
| `search_term` | `TEXT` | opcional | **De onde o produto veio.** `ofertas MLB6899` é a página geral (fonte antiga, fora de escopo); `loja:pokemon` e `loja:copag` vêm do `Pokemon Store Scanner`. É a coluna que separa a procedência |
| `idioma` | `TEXT` | opcional | Idioma da carta detectado no título: `pt`, `en`, `ja`, `ko`, `zh`, `ambiguo` ou `desconhecido` |
| `idioma_confianca` | `NUMERIC(3,2)` | opcional | Confiança da detecção, de 0 a 1. O Publisher só exibe o idioma a partir de 0,85 |
| `vendedor` | `TEXT` | opcional | Nome do vendedor, quando o anúncio expõe. Aparece em poucos casos (~3%) |
| `created_at` | `TIMESTAMPTZ` | padrão `now()` | Quando o bot viu o produto pela primeira vez |
| `posted_at` | `TIMESTAMPTZ` | opcional | Quando foi publicado. Vazio enquanto não publica |

### Os valores de `status`

| Status | Significado | Quem coloca |
| --- | --- | --- |
| `pending` | **Na fila.** Aprovado, esperando a vez de ser publicado | Scanner, node `Insert Promo` |
| `posted` | **Publicado** no canal | Publisher, node `Mark as Posted` |
| `blocked` | **Bloqueado**, nunca vai ao canal. Motivo em `blocked_reason` | Scanner, node `Insert Blocked` |
| `review` | **Aguardando sua decisão** por autenticidade duvidosa | Scanner, node `Insert Review` |
| `descartado` | **Fora de escopo.** Entrou na fila por uma fonte que depois deixou de valer. Fica guardado para auditoria e para impedir reinserção | Você, na mão (SQL do runbook) |

> O plano original previa também os status `duplicate` e `error`, mas **nenhum node do bot
> escreve esses dois valores** hoje. Duplicata é tratada pelo `ON CONFLICT` (o produto
> simplesmente não é regravado) e registrada em `promos_log`; erro vai para `promos_erros`.
> Se você ver `duplicate` ou `error` em `promos`, foi alguém mexendo à mão.

### Detalhes que importam

**Por que centavos e não reais.** `price_cents` é inteiro. Preço em número decimal
(`38.29`) sofre erro de arredondamento em conta de computador, e num bot que calcula
desconto e economia isso apareceria como centavo errado no post. Inteiro em centavos nunca
erra. A conversão de volta é feita na hora de exibir: `(centavos / 100)` com vírgula.

**Por que `discount_pct` é `NUMERIC(5,2)` e não inteiro.** Para não perder precisão: um
desconto de 15,85% ficaria como 15% ou 16% se fosse inteiro, e isso muda se o produto passa
ou não pelo corte de 15%. O tipo aceita até 999,99, muito mais do que precisa.

**Por que `item_id` é único sozinho.** É o que faz o `ON CONFLICT (item_id)` funcionar.
No Store Scanner, o conflito **ignora** a linha nova — salvo a exceção da
[Decisão 33](historico-de-decisoes.md#decisão-33--repostar-se-o-preço-da-vitrine-cair-depois-do-post):
item já `posted` com queda ≥ 5% ou ≥ R$ 5 vira `UPDATE` para `pending`. Item `blocked` /
`review` continua sem segunda chance automática. Como liberar um item específico:
[runbook, seção 9](runbook.md#9-liberar-um-produto-para-ser-reavaliado).

> **Divergência com o plano antigo:** uma versão anterior do plano descrevia a tabela com
> uma restrição composta `UNIQUE (item_id, status)`. Ela **não existe** no schema real: a
> única restrição de unicidade da tabela é `promos_item_id_key`, que é `UNIQUE (item_id)`,
> conferida no banco vivo. E é melhor assim — com a composta, o `ON CONFLICT (item_id)` dos
> INSERTs não funcionaria, e o mesmo produto poderia ser gravado uma vez como `pending` e
> outra como `blocked`.

### SQL de criação (conforme o node `Create promos`)

```sql
CREATE TABLE IF NOT EXISTS promos (
    id                   BIGSERIAL PRIMARY KEY,
    item_id              TEXT NOT NULL UNIQUE,
    title                TEXT NOT NULL,
    price_cents          INTEGER NOT NULL,
    original_price_cents INTEGER,
    discount_pct         NUMERIC(5,2),
    seller_reputation    NUMERIC(3,1),
    seller_sales         INTEGER DEFAULT 0,
    category_id          TEXT,
    thumbnail            TEXT,
    permalink            TEXT,
    utm_link             TEXT,
    status               TEXT NOT NULL DEFAULT 'pending',
    blocked_reason       TEXT,
    telegram_message_id  BIGINT,
    search_term          TEXT,
    created_at           TIMESTAMPTZ DEFAULT now(),
    posted_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_promos_status       ON promos(status);
CREATE INDEX IF NOT EXISTS idx_promos_created      ON promos(created_at);
CREATE INDEX IF NOT EXISTS idx_promos_pending_disc ON promos(discount_pct DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_promos_posted_at    ON promos(posted_at)         WHERE status = 'posted';
```

As três colunas mais novas entram por um `ALTER TABLE` separado, no node
`Alter promos idioma e vendedor`, para que um banco já existente também as receba:

```sql
ALTER TABLE promos ADD COLUMN IF NOT EXISTS idioma           TEXT;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS idioma_confianca NUMERIC(3,2);
ALTER TABLE promos ADD COLUMN IF NOT EXISTS vendedor         TEXT;
CREATE INDEX IF NOT EXISTS idx_promos_vendedor ON promos(vendedor);
```

---

## Tabela `promos_log`

O diário de bordo. Registra **toda** decisão do bot, inclusive sobre produtos que nem
entram em `promos`. É a tabela que permite auditar o filtro e calibrar as regras olhando
dados reais em vez de palpite.

| Coluna | Tipo | O que significa |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Chave primária |
| `item_id` | `TEXT` | O produto. Fica `NULL` em caso de erro sem produto identificado |
| `decision` | `TEXT` | A decisão tomada. Valores abaixo |
| `reason` | `TEXT` | O motivo em texto legível, incluindo o detalhamento do score de autenticidade |
| `created_at` | `TIMESTAMPTZ` | Quando a decisão foi tomada |

### Os valores de `decision`

| Decisão | Quando acontece | Gravado por |
| --- | --- | --- |
| `aceito` | Passou em tudo e entrou na fila | `Log Aceito` |
| `duplicado` | Já estava no banco; o `INSERT` foi ignorado | `Log Aceito` ou `Log Bloqueado` (eles detectam isso) |
| `bloqueado` | Desconto acima de 60% **ou** score de autenticidade ≤ −40 | `Log Bloqueado` |
| `descartado` | Desconto abaixo do mínimo da loja (10% ou 15% no Store Scanner; 15% no Scanner v2) | `Log Descartado` |
| `revisao` | Autenticidade duvidosa, mandado para curadoria | `Log Review` |
| `posted` | Publicado no canal | `Log Posted` |
| `repost` | Item já postado reenfileirado porque o preço da vitrine caiu (≥ 5% ou ≥ R$ 5) | `Log Aceito Loja` (quando o `ON CONFLICT` faz `UPDATE`) |

O campo `reason` é onde está o ouro. Exemplo de conteúdo real:

```
desconto 41% ok | autenticidade -63 (suspeito) - contra: lote de 5 cartas;
chamariz de raridade em lote: ultra rara + brilhante; lote de cartas japonesas,
padrao das replicas mais comuns; preco por carta implausivel: R$ 7.66 para carta
anunciada como rara | a favor: reputacao do vendedor 4.8; mais de 1000 vendas
```

### SQL de criação

```sql
CREATE TABLE IF NOT EXISTS promos_log (
    id         BIGSERIAL PRIMARY KEY,
    item_id    TEXT,
    decision   TEXT,
    reason     TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promos_log_item    ON promos_log(item_id);
CREATE INDEX IF NOT EXISTS idx_promos_log_created ON promos_log(created_at);
```

---

## Tabela `promos_erros`

A fila de erros, ou *dead letter queue* — o nome que se dá em programação para "o lugar
onde vai o que falhou, para não se perder em silêncio". Também é onde o bot avisa que o
parser quebrou.

**Se você só for olhar uma tabela de vez em quando, olhe esta.** Vazia significa que tudo
vai bem.

| Coluna | Tipo | O que significa |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Chave primária |
| `item_id` | `TEXT` | O produto envolvido, se houver. `NULL` quando o parser não conseguiu ler nada |
| `payload` | `JSONB` | Os dados crus que falharam, em JSON. Em erro de parser, traz diagnóstico: tamanho do HTML, número de cards, estratégia usada e um trecho de 600 caracteres da página |
| `error_step` | `TEXT` | Em que etapa falhou. Valores abaixo |
| `error_msg` | `TEXT` | A mensagem do erro |
| `retries` | `INTEGER` | Contador de tentativas. Existe na estrutura, mas **nenhum node do bot o usa hoje** — fica sempre `0` |
| `created_at` | `TIMESTAMPTZ` | Quando o erro aconteceu |

### Os valores de `error_step`

| Valor | Significado | Gravado por |
| --- | --- | --- |
| `busca` | Falhou ao ler a página **ou** ao gravar um produto aceito. Inclui **quebra do parser** | `Log Parse Error` e `Log Insert Error` |
| `filtro` | Falhou ao gravar um produto bloqueado | `Log Block Error` |
| `revisao` | Falhou ao gravar um produto em revisão | `Log Review Error` |
| `post` | O Telegram recusou a publicação | `Log Publish Error` |
| `afiliado` | O item **não foi publicado** porque o `utm_link` não é um link de afiliado válido. Não é erro de execução: é a trava de comissão fazendo o trabalho dela | `Log Nao Publicavel` e `Registrar Pendentes Impublicaveis` |
| `foto` | O item **não foi publicado** porque o `thumbnail` está vazio ou não é uma URL `http`. Também não é erro de execução: sem foto o `sendPhoto` do Telegram falharia e o item travaria a fila | `Log Nao Publicavel` e `Registrar Pendentes Impublicaveis` |

> O valor `busca` é usado em duas situações diferentes (parser quebrado e falha de
> gravação). Para distinguir, olhe o `item_id`: **quebra do parser tem `item_id` nulo** e
> um `payload` com o campo `motivo`.

### SQL de criação

```sql
CREATE TABLE IF NOT EXISTS promos_erros (
    id         BIGSERIAL PRIMARY KEY,
    item_id    TEXT,
    payload    JSONB,
    error_step TEXT,
    error_msg  TEXT,
    retries    INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promos_erros_created ON promos_erros(created_at);
```

---

## Tabela `promos_review`

A fila de curadoria humana: produtos cujo score de autenticidade ficou na zona cinzenta
(entre −40 e +25) e que **não vão para o canal** até você decidir.

| Coluna | Tipo | O que significa |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Chave primária |
| `item_id` | `TEXT` | O produto |
| `title` | `TEXT` | Título do anúncio, para você julgar sem sair da consulta |
| `price_cents` | `INTEGER` | Preço em centavos |
| `discount_pct` | `NUMERIC(5,2)` | Desconto |
| `motivo` | `TEXT` | Por que caiu em dúvida, com o score e o detalhamento |
| `status` | `TEXT` | `pending`, `approved` ou `rejected`. Começa como `pending` |
| `created_at` | `TIMESTAMPTZ` | Quando entrou na fila |

### Detalhes importantes

**O produto fica em dois lugares.** Ele entra em `promos` com `status='review'` (então não é
pego pela fila de publicação, que só olha `pending`) **e** em `promos_review`, que é a
versão amigável para você revisar. Aprovar um item significa mudar o status nas duas
tabelas — o SQL está em [runbook, seção 4](runbook.md#4-revisar-a-fila-de-revisão-humana).

**Não reenfileira.** O node `Queue Review` usa `WHERE NOT EXISTS`, então o mesmo produto não
entra várias vezes na fila de revisão a cada varredura.

**A coluna `status` é sua, não do bot.** Nenhum node do bot muda esse valor. Ela existe para
você marcar o que já revisou.

### SQL de criação

```sql
CREATE TABLE IF NOT EXISTS promos_review (
    id           BIGSERIAL PRIMARY KEY,
    item_id      TEXT,
    title        TEXT,
    price_cents  INTEGER,
    discount_pct NUMERIC(5,2),
    motivo       TEXT,
    status       TEXT DEFAULT 'pending',
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promos_review_status ON promos_review(status);
```

---

## Tabela `cupons`

O cadastro manual de cupons do Mercado Livre. Alimentada **por você**, nunca pelo bot.
O motivo de ser manual está em [regras-de-negocio.md](regras-de-negocio.md#8-cupons-manuais-de-propósito).

| Coluna | Tipo | O que significa |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Chave primária |
| `codigo` | `TEXT` | O código digitável (ex.: `MELI10`). Deixe `NULL` se o cupom é automático no checkout |
| `descricao` | `TEXT` | obrigatório. O texto que aparece no post (ex.: `10% OFF em Cartas Colecionáveis`) |
| `valor_minimo_cents` | `INTEGER` | Pedido mínimo, em centavos. `7900` = R$ 79,00. `NULL` = sem mínimo |
| `categoria_id` | `TEXT` | Restringe a uma categoria do ML. `NULL` = vale para qualquer produto |
| `valido_de` | `TIMESTAMPTZ` | Início da validade. Padrão: agora |
| `valido_ate` | `TIMESTAMPTZ` | Fim da validade. `NULL` = sem prazo |
| `ativo` | `BOOLEAN` | obrigatório, padrão `TRUE`. É o interruptor para desligar sem apagar |
| `prioridade` | `INTEGER` | obrigatório, padrão `0`. Quando há vários cupons válidos, **o maior vence** |
| `observacao` | `TEXT` | Anotação livre para você (de onde veio o cupom, condições) |
| `created_at` | `TIMESTAMPTZ` | Quando foi cadastrado |

> Esta tabela **é criada pelo `Pokemon Schema Setup v2`**, no node `Create cupons`, junto
> com o índice `idx_cupons_ativos`. Até 13/08/2026 ela vivia fora do workflow, criada à mão,
> e recriar o banco do zero deixava o Publisher quebrado na consulta `Fetch Next Pending`,
> que faz `LEFT JOIN LATERAL` com ela. Isso foi corrigido.

### SQL de criação

```sql
CREATE TABLE IF NOT EXISTS cupons (
    id                 BIGSERIAL PRIMARY KEY,
    codigo             TEXT,
    descricao          TEXT NOT NULL,
    valor_minimo_cents INTEGER,
    categoria_id       TEXT,
    valido_de          TIMESTAMPTZ DEFAULT now(),
    valido_ate         TIMESTAMPTZ,
    ativo              BOOLEAN NOT NULL DEFAULT TRUE,
    prioridade         INTEGER NOT NULL DEFAULT 0,
    observacao         TEXT,
    created_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cupons_ativos ON cupons (ativo, prioridade DESC, valido_ate);
```

## Tabela `cupons_itens`

Allowlist do produto que o Eduardo testou. Sem linha aqui, o cupom **não aparece** no post
([Decisão 39](historico-de-decisoes.md#decisão-39--cupom-só-no-produto-testado-e-link-com-wid)).

| Coluna | Tipo | O que significa |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Chave primária |
| `cupom_id` | `BIGINT` | FK para `cupons.id` |
| `item_id` | `TEXT` | Anúncio (`wid`, ex. `MLB4836905147`) |
| `catalog_id` | `TEXT` | Ficha `/p/MLB…` ou `/up/MLBU…` — casa outros anúncios da mesma ficha |
| `created_at` | `TIMESTAMPTZ` | Quando foi liberado |

`promos` ganhou `loja_slug` (cópia estável do slug da loja). O `utm_link` novo leva `wid=`.

> **Schema Setup v2 ainda não cria esta tabela.** Foi aplicada no banco vivo em 14/08/2026
> via SQL Console. Recriar o banco do zero exige o SQL em
> `backups/2026-08-14/sql/migracao-cupons-itens.sql` (ou pedir ao agente para rodar de novo).
> Sem isso, o `Fetch Next Pending` quebra no `EXISTS cupons_itens`.

---

## Tabela `vendedores_bloqueados`

Criada em 13/08/2026, depois da descoberta de que o selo "Loja oficial" não garante nada
([P15 no troubleshooting](troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon)).
Guarda nomes de vendedor que o bot deve rejeitar de imediato.

Ficou em tabela, e não fixa no código, justamente para o Eduardo poder adicionar um nome com
uma linha de SQL, sem abrir workflow.

| Coluna | Tipo | Regra | O que significa |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | chave primária | Número sequencial interno |
| `nome` | `TEXT` | obrigatório, **único** | Nome do vendedor como aparece no anúncio. A comparação do bot ignora maiúsculas e acentos |
| `motivo` | `TEXT` | opcional | Por que foi bloqueado. Vale escrever: é o que explica a decisão meses depois |
| `ativo` | `BOOLEAN` | padrão `TRUE` | Desbloquear sem apagar o histórico é só virar para `FALSE` |
| `created_at` | `TIMESTAMPTZ` | padrão `now()` | Quando entrou na lista |

O Scanner lê essa tabela no início de cada varredura, no node `Load Seller Blocklist`, que
devolve um único JSON com os nomes ativos. Se a consulta falhar, o node está configurado para
continuar — a varredura não para por causa da lista.

**É lista de bloqueio apenas.** Não estar nela não aprova ninguém: só ~3% dos anúncios expõem
o nome do vendedor. Como adicionar e remover:
[runbook, seção 12](runbook.md#12-lista-de-bloqueio-de-vendedores).

### SQL de criação

```sql
CREATE TABLE IF NOT EXISTS vendedores_bloqueados (
    id         BIGSERIAL PRIMARY KEY,
    nome       TEXT NOT NULL UNIQUE,
    motivo     TEXT,
    ativo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendedores_bloqueados_ativo ON vendedores_bloqueados(ativo);
```

O `Pokemon Schema Setup v2` também já insere os dois primeiros nomes (`Lehadry Jóias` e
`Vikn Comércio de Auto Peças`) com `ON CONFLICT (nome) DO NOTHING`, para que um banco
recriado do zero nasça com a proteção ligada.

---

## Tabela `lojas_confiaveis` — as lojas oficiais varridas

Esta tabela é o **cadastro das lojas que o `Pokemon Store Scanner` varre**, e é o único lugar
onde se decide de onde vem o que o bot publica. Ela não é criada pelo `Pokemon Schema Setup
v2`: quem cria (e mantém atualizada) é o próprio `Pokemon Store Scanner`, no primeiro node de
cada execução, usando `CREATE TABLE IF NOT EXISTS`.

A ideia central é que **cada loja tem regras próprias**, porque cada loja tem um mix de
produtos diferente. Por isso o filtro de título e o desconto mínimo moram na linha da loja, e
não no código do workflow: cadastrar uma loja nova é SQL, nunca programação.

| Coluna | Tipo | Regra | O que significa |
| --- | --- | --- | --- |
| `id` | `SERIAL` | chave primária | Número sequencial interno |
| `slug` | `TEXT` | obrigatório, **único** | O pedaço final da URL da loja: `mercadolivre.com.br/loja/**pokemon**`. É o que o scanner usa para montar o endereço |
| `nome` | `TEXT` | obrigatório | Nome legível, só para você se localizar |
| `official_store_id` | `INTEGER` | opcional | Identificador da loja oficial dentro do Mercado Livre. **Preenchido sozinho** pelo scanner (loja oficial da Pokémon: `236642`; COPAG: `2321`) |
| `owner_id` | `BIGINT` | opcional | Identificador do dono da loja no ML. Também preenchido sozinho |
| `storefront_id` | `TEXT` | opcional | Subdomínio da vitrine, preenchido sozinho |
| `ativa` | `BOOLEAN` | obrigatório, padrão `TRUE` | **A chave do escopo.** Só lojas com `TRUE` são varridas |
| `prioridade` | `SMALLINT` | obrigatório, padrão `100` | Ordem da varredura, menor primeiro |
| `desconto_minimo` | `NUMERIC(5,2)` | obrigatório, padrão `15` | Desconto mínimo, em porcentagem, para a oferta entrar na fila |
| `preco_minimo` | `NUMERIC(10,2)` | obrigatório, padrão `0` | Piso de preço |
| `preco_maximo` | `NUMERIC(10,2)` | opcional | Teto de preço. `NULL` = sem teto |
| `filtro_titulo` | `TEXT` | opcional na estrutura, **obrigatório na prática** | **Expressão regular** que o título precisa casar, testada no título original **e** no normalizado (sem acento). `NULL` aceita tudo — e foi assim que um Funko Pop entrou no canal. A regra completa está na [Regra 0b](regras-de-negocio.md#regra-0b--tcg-acessório-de-tcg-e-figura-pokémon-não-merch) |
| `ultima_varredura` | `TIMESTAMPTZ` | opcional | Quando a loja foi varrida pela última vez. É o sinal de vida da varredura |
| `ultimo_erro` | `TEXT` | opcional | Motivo da última falha, ou `NULL` quando deu tudo certo |
| `produtos_ultima` | `INTEGER` | opcional | Quantos produtos a vitrine tinha na última varredura |
| `ofertas_ultima` | `INTEGER` | opcional | Quantos daqueles produtos estavam com preço "de/por" |
| `observacoes` | `TEXT` | opcional | Anotação livre: por que a loja é confiável, por que está desligada |
| `criada_em` | `TIMESTAMPTZ` | padrão `now()` | Quando a loja foi cadastrada |

As três colunas de identificação (`official_store_id`, `owner_id`, `storefront_id`) são
preenchidas com `COALESCE`, ou seja, **só quando ainda estão vazias**. Servem como prova de
procedência: se um dia a loja oficial mudar de dono, o número muda e você percebe.

### SQL de criação (conforme o node `Garantir Schema das Lojas`)

```sql
CREATE TABLE IF NOT EXISTS lojas_confiaveis (
    id                SERIAL PRIMARY KEY,
    slug              TEXT NOT NULL UNIQUE,
    nome              TEXT NOT NULL,
    official_store_id INTEGER,
    owner_id          BIGINT,
    storefront_id     TEXT,
    ativa             BOOLEAN NOT NULL DEFAULT TRUE,
    prioridade        SMALLINT NOT NULL DEFAULT 100,
    desconto_minimo   NUMERIC(5,2) NOT NULL DEFAULT 15,
    preco_minimo      NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco_maximo      NUMERIC(10,2),
    filtro_titulo     TEXT,
    ultima_varredura  TIMESTAMPTZ,
    ultimo_erro       TEXT,
    produtos_ultima   INTEGER,
    ofertas_ultima    INTEGER,
    observacoes       TEXT,
    criada_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lojas_confiaveis_ativa ON lojas_confiaveis (ativa, prioridade);
```

As duas lojas iniciais entram com `ON CONFLICT (slug) DO NOTHING`, então rodar o workflow
várias vezes não sobrescreve nada que você tenha ajustado à mão:

| Slug | Nome | Ativa | Desconto mínimo | Filtro de título |
| --- | --- | --- | --- | --- |
| `pokemon` | Pokemon (loja oficial) | **Sim** | **10%** (Pacote A, Decisão 35) | filtro TCG + acessório + figura, desde 16/08 (Decisão 41; 14/08 era Decisão 37; em 13/08 era só lacrado; antes era `NULL`) |
| `copag` | COPAG | **Sim**, desde 13/08/2026 | **10%** (Pacote A) | o mesmo das 8 lojas (Decisão 41) |
| `brinkjr` | BrinkJr | **Sim**, desde 13/08 | **15%** | o mesmo filtro de TCG |
| `attack-toys` | Attack Toys | **Sim**, desde 13/08 | **15%** | o mesmo filtro de TCG |
| `cade-meu-jogo` | Cadê Meu Jogo | **Sim**, desde 13/08 | **15%** | o mesmo filtro de TCG |
| `psz3d` | Psz3D | **Sim**, desde 13/08 noite | **15%** | o mesmo filtro de TCG |
| `ilusoes-industriais` | Ilusoes Industriais | **Sim**, desde 13/08 noite | **15%** | o mesmo filtro de TCG |
| `parolar` | PAROLAR | **Sim**, desde 13/08 noite | **15%** | o mesmo filtro de TCG |
| `escala-miniaturas` | Escala Miniaturas | **Sim**, desde 13/08 noite | **15%** | filtro **sem** `\bcartas\b` (a vitrine tem carta avulsa); acessório e figura Pokémon entram |
| `dalo-vendas` | Dalo Vendas | **Sim**, desde 16/08 noite | **15%** | mesmo filtro das 9; autorizada pelo Eduardo; homepage com ETB Equilíbrio Perfeito |

A COPAG nasceu inativa e foi ligada no mesmo dia, depois que se constatou que ela é o vendedor
real de vários itens dentro da loja oficial (que é *multiseller*). O `filtro_titulo` dela é
obrigatório e não deve ser removido: a vitrine tem baralho de Truco, Harry Potter, Bicycle,
NFL e Lorcana, que não podem ir para um canal de Pokémon.

A loja oficial rodou sem filtro nenhum até 13/08/2026, na premissa de que "tudo lá já é
Pokémon" — o que é verdade, mas não responde à pergunta certa. A loja oficial vende **produto
licenciado** também, e foi de lá que saiu o Funko Pop publicado no canal. Desde 14/08
([Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova))
nove lojas usam a mesma regex (cartas no plural + acessório + figura, com Pokémon); a Escala
Miniaturas fica sem `\bcartas\b`. Texto completo na
[Regra 0b](regras-de-negocio.md#regra-0b--tcg-acessório-de-tcg-e-figura-pokémon-não-merch).

---

## Índices

Um **índice** é um atalho que o banco cria para achar linhas rápido, do mesmo jeito que o
índice de um livro evita ler todas as páginas. Sem índice, o banco lê a tabela inteira toda
vez. Com poucos milhares de linhas isso nem se nota, mas os índices abaixo foram criados
para casar exatamente com as consultas que o bot faz a cada 2 minutos.

**Todos os índices abaixo são criados pelo `Pokemon Schema Setup v2`.** Nenhum depende de
passo manual — rodar aquele workflow num banco vazio já deixa o desempenho no lugar.

| Índice | Tabela e colunas | Para que serve |
| --- | --- | --- |
| `idx_promos_status` | `promos(status)` | Filtrar por status. Serve às consultas gerais e às suas conferências |
| `idx_promos_created` | `promos(created_at)` | Ordenar e filtrar por data de descoberta |
| `idx_promos_pending_disc` | `promos(discount_pct DESC)` só onde `status='pending'` | Índice **parcial**, ordenado por desconto. Casa exatamente com a consulta `Fetch Next Pending`, que roda a cada 2 minutos |
| `idx_promos_posted_at` | `promos(posted_at)` só onde `status='posted'` | Índice parcial. Casa com a contagem diária do node `Count Today Posts` |
| `idx_promos_log_item` | `promos_log(item_id)` | Buscar todo o histórico de decisões de um produto |
| `idx_promos_log_created` | `promos_log(created_at)` | Consultas de log por período ("o que o bot decidiu hoje") |
| `idx_promos_erros_created` | `promos_erros(created_at)` | Ver os erros mais recentes primeiro |
| `idx_promos_review_status` | `promos_review(status)` | Listar a fila de revisão pendente |
| `idx_cupons_ativos` | `cupons(ativo, prioridade DESC, valido_ate)` | Casa com a escolha do melhor cupom válido |

> **Um índice parcial** é um índice que cobre só parte das linhas da tabela. Como a consulta
> da fila só olha itens `pending`, não faz sentido indexar os itens já publicados: o índice
> fica pequeno, rápido e barato de manter.

Além desses 9, o banco cria automaticamente um índice para cada chave primária (5, uma por
tabela) e um para a restrição de unicidade `promos_item_id_key`. **Total: 15 índices**, que
é o que a consulta a `pg_indexes` retorna hoje.

---

## Perguntas frequentes sobre os dados

**"Posso apagar linhas antigas?"** Sim, mas com critério. `promos_log` e `promos_erros`
crescem para sempre e podem ser limpas de tempos em tempos. **Não apague de `promos`** sem
pensar: apagar uma linha faz o produto voltar a ser "novo" para o bot, e ele pode ser
republicado.

**"E se eu apagar um post do canal, o bot reposta?"** Não. O bot só olha o banco, não o
canal. Para republicar, é preciso mudar o status daquele item de volta para `pending`.

**"Por que a fila não anda?"** Cheque na ordem: o workflow está ativo? Está dentro da
janela de 8h–22h? Já bateu o teto de 40 hoje ou o de 6 na última hora? Tem item `pending`?
O Scanner aceitou algo que já estava `posted`? A
[seção de troubleshooting](troubleshooting.md#p1--o-bot-não-está-postando-nada) tem o
roteiro completo.
