# Troubleshooting

Problemas conhecidos, em formato **sintoma → causa → solução**. A maioria dos casos aqui
**aconteceu de verdade neste projeto** — não são hipóteses. Isso os torna especialmente
valiosos: são as armadilhas reais desta montagem.

**Tabela de decisão rápida**

| O que você observa | Vá para |
| --- | --- |
| Nenhum post novo no canal | [P1](#p1--o-bot-não-está-postando-nada) |
| `promos_erros` com linhas novas, item vazio | [P2](#p2--promos_erros-enchendo-com-error_stepbusca--o-parser-quebrou) |
| Erro mencionando `suspicious-traffic` | [P3](#p3--o-anti-bot-do-mercado-livre-voltou) |
| Erro 400 do Telegram | [P4](#p4--post-falhando-com-erro-400-do-telegram) |
| "Couldn't connect with these settings" na credencial do banco | [P5](#p5--credencial-do-banco-para-de-conectar-couldnt-connect-with-these-settings) |
| Os workflows Pokemon desapareceram do n8n | [P6](#p6--os-workflows-desapareceram-do-n8n) |
| Node vermelho reclamando de credencial | [P7](#p7--node-vermelho-reclamando-de-credencial) |
| A fila não anda, sempre o mesmo item | [P8](#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha) |
| O banco gravou `{{ $json.item_id }}` como texto | [P9](#p9--o-banco-gravou-a-expressão-como-texto-literal) |
| `access to env vars denied` | [P10](#p10--access-to-env-vars-denied) |
| Post saiu sem link de afiliado | [P11](#p11--post-sem-link-de-afiliado) |
| Um produto foi classificado errado e não volta | [P12](#p12--produto-classificado-errado-e-que-não-volta-mais) |
| Fila sempre vazia, poucos produtos | [P13](#p13--a-fila-vive-vazia-e-o-canal-posta-pouco) |
| Alterei o workflow e ele parou de funcionar | [P14](#p14--mexi-no-workflow-e-quebrou) |
| O bot aprovou uma falsificação com selo "Loja oficial" | [P15](#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon) |
| O link do post tem `matt_word=MLB` (formato antigo) | [P16](#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos) |
| Um arquivo `.md` aparece embaralhado ou cheio de espaços | [P17](#p17--documento-ilegível-salvo-em-utf-16-pelo-powershell) |
| Salvei a correção, mas em produção o comportamento antigo continua | [P18](#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada) |
| Catalog Scanner / ScraperAPI devolve 500 na listagem do ML | [P19](#p19--catalog-scanner-a-listagem-do-ml-falha-no-scraperapi) |
| Painel da réplica abre, mas botões/rotas não funcionam | [P20](#p20--o-painel-da-réplica-abre-mas-nada-funciona) |
| Réplica publica texto sem a foto do produto | [P21](#p21--a-réplica-publica-sem-a-foto-do-produto) |

---

## P1 — O bot não está postando nada

**Sintoma:** o canal está parado, mesmo em horário comercial.

**Causa:** são várias possibilidades, e vale checar nesta ordem, da mais provável para a
menos.

**Solução — o roteiro de diagnóstico:**

**1. O workflow está ativo?** Abra o `Pokemon Publisher v2`
(`https://srv1897392.hstgr.cloud/workflow/FXNWeT9C7dEA0DUY`) e veja se o botão **Active**
está ligado. Esta é de longe a causa mais comum, porque os workflows foram deixados
desativados de propósito e alguém precisa ligar.

**2. Está dentro da janela de horário?** O bot só publica entre 8h e 22h no horário de
Brasília. Fora disso ele acorda, olha a hora e volta a dormir — o que é o comportamento
correto, não um defeito.

**3. Já bateu o teto de 40 posts hoje?**

```sql
SELECT count(*) AS postados_hoje FROM promos
WHERE status = 'posted' AND posted_at::date = CURRENT_DATE;
```

**3b. Já bateu o teto de 6 na última hora?** O Publisher conta a hora **corrida**
(`posted_at > now() - interval '1 hour'`), não o relógio cheio. Se a última execução
terminar em `Hourly Limit Reached`, o bot está saudável e só espera.

```sql
SELECT count(*) AS postados_ultima_hora FROM promos
WHERE status = 'posted' AND posted_at > now() - interval '1 hour';
```

**4. Tem item na fila?**

```sql
SELECT count(*) AS na_fila FROM promos WHERE status = 'pending';
```

Se der zero, o problema é do **Scanner**, não do Publisher: nada novo está entrando. Antes
de ir ao parser, confira se o Scanner **aceitou** itens que já estão `posted` — em 14/08
o canal ficou mudo o dia inteiro assim: sete ofertas válidas (15–33% OFF) no log `aceito`,
fila `pending = 0`, porque `INSERT ON CONFLICT DO NOTHING` não reenfileira. Só volta à
fila se o preço cair o bastante ([Decisão 33](historico-de-decisoes.md#decisão-33--repostar-se-o-preço-da-vitrine-cair-depois-do-post)).
Não reenfileire à mão o mesmo lote duas vezes.

```sql
SELECT l.item_id, left(p.title, 60) AS titulo, p.status, p.posted_at
FROM promos_log l
JOIN promos p ON p.item_id = l.item_id
WHERE l.decision = 'aceito'
  AND l.created_at > now() - interval '3 hours'
ORDER BY l.created_at DESC;
```

Se isso não explicar, vá para
[P2](#p2--promos_erros-enchendo-com-error_stepbusca--o-parser-quebrou) e
[P13](#p13--a-fila-vive-vazia-e-o-canal-posta-pouco).

**5. Tem erro registrado?**

```sql
SELECT * FROM promos_erros ORDER BY created_at DESC LIMIT 10;
```

**Se todos os passos estiverem bem** e ainda assim nada sai: no n8n, vá em **Executions**,
ache a última execução do Publisher e clique nela. Você vai ver visualmente por qual node o
fluxo passou e onde parou. Um fluxo que termina em `Outside Posting Window`,
`Daily Limit Reached` ou `Hourly Limit Reached` está funcionando como projetado.

---

## P2 — `promos_erros` enchendo com `error_step='busca'` — o parser quebrou

**Sintoma:** linhas novas em `promos_erros` com `error_step = 'busca'` e `item_id` vazio.
Nenhum produto novo entrando em `promos`. A mensagem costuma ser
`_n.ctx.r nao encontrado no HTML` ou `parser extraiu 0 itens de um HTML de N bytes`.

**Causa:** o bot lê os produtos de dentro de um bloco de JSON no HTML da página de ofertas
do Mercado Livre. **O Mercado Livre pode mudar esse HTML a qualquer momento, sem avisar.**
Este é o risco estrutural número um do projeto: a fonte de dados não é uma API com contrato,
é uma página de site.

**Solução:**

1. **Confirme o que está chegando.** Rode a consulta de diagnóstico da
   [seção 6 do runbook](runbook.md#6-conferir-se-o-parser-quebrou) e olhe o campo
   `trecho_da_pagina`. Ele mostra os primeiros 600 caracteres do que o Mercado Livre
   devolveu.
2. **Abra a página no seu navegador:**
   `https://www.mercadolivre.com.br/ofertas?category=MLB6899`
   - A página não existe mais ou a categoria mudou? Então é preciso achar a nova URL.
   - A página existe e mostra ofertas normalmente? Então o formato interno mudou.
3. **Para confirmar que o formato mudou:** no navegador, aperte `Ctrl+U` para ver o
   código-fonte da página e procure (`Ctrl+F`) por `_n.ctx.r`. Se não achar, confirmado: o
   Mercado Livre trocou a estrutura.
4. **A correção é reescrever o parser**, no node `Normalize and Classify` do Scanner. Isso
   requer alguém (ou um agente de IA) capaz de olhar o novo formato da página e adaptar o
   código. É a manutenção previsível deste projeto.

**Enquanto não corrigir:** desative o Scanner para parar de encher a tabela de erros. O
Publisher pode continuar ligado, esvaziando a fila que já existe.

**Onde procurar o formato novo:** as estratégias antigas de reserva (`__PRELOADED_STATE__`,
`ld+json`, cards HTML) ainda estão no código como fallback. Se o Mercado Livre voltar para
um daqueles formatos, o bot pode até se recuperar sozinho.

---

## P3 — O anti-bot do Mercado Livre voltou

**Sintoma:** em `promos_erros`, mensagem contendo
`anti-bot do MercadoLivre: HTML contem suspicious-traffic`.

**Causa:** o Mercado Livre detectou que as requisições vêm de um robô e passou a devolver
uma página de bloqueio em vez do conteúdo.

**Contexto histórico importante:** a **página de busca** (`lista.mercadolivre.com.br`)
sempre teve esse anti-bot a partir da VPS. A **página de ofertas**
(`www.mercadolivre.com.br/ofertas`) nunca teve — e é exatamente por isso que ela é a fonte
de dados do projeto. Se o anti-bot chegou à página de ofertas, é uma mudança nova de
política do Mercado Livre.

**Solução, em ordem de esforço:**

1. **Aumente o intervalo do Scanner.** Muitas requisições em pouco tempo é o gatilho mais
   comum. No node `A Cada 5 Minutos` do Store Scanner, aumente o campo **Minutes Interval**
   para 15 ou 45 minutos, ou passe a unidade para horas. **Não diminua para 2 minutos.**
   Este é o primeiro remédio, e o mais barato. Confira também se o node `Jitter Aleatorio`
   continua no fluxo: a espera aleatória de até 60 segundos existe justamente para o acesso
   não parecer cronometrado por máquina. (O Scanner v2 inativo ainda tem o node
   `Every 10 Minutes` — só importa se alguém religá-lo.)
2. **Confira os cabeçalhos.** No node `Search MercadoLivre` existem quatro cabeçalhos que
   fazem a requisição parecer um navegador de verdade: `User-Agent` (Chrome 131), `Accept`,
   `Accept-Language: pt-BR` e `Upgrade-Insecure-Requests`. Se alguém removeu algum, recoloque.
   O `User-Agent` pode ter envelhecido; atualizar para uma versão atual do Chrome às vezes
   resolve.
3. **Teste manualmente da própria VPS** se a página responde. Se responder no navegador mas
   não pela VPS, é bloqueio por endereço de rede.
4. **Só então considere proxy.** Um serviço de proxy residencial resolveria, mas custa
   dinheiro e adiciona uma dependência externa. Foi deliberadamente evitado até hoje.

**O que NÃO tentar:** voltar para a API oficial do Mercado Livre. Ela está fechada por
política, não por bloqueio de rede, e isso já foi comprovado — veja
[histórico de decisões](historico-de-decisoes.md#decisão-1--a-api-oficial-do-mercado-livre-está-descartada).

---

## P4 — Post falhando com erro 400 do Telegram

**Sintoma:** o post não sai. Em `promos_erros`, `error_step = 'post'`. No histórico de
execuções do n8n, o node `Post to Telegram` está vermelho com erro `400 Bad Request`,
frequentemente com a mensagem `can't parse entities`.

**Causa:** o post usa `parse_mode=HTML`, e nesse modo os caracteres `&`, `<` e `>` têm
significado especial para o Telegram. Se um deles chegar sem tratamento, o Telegram recusa a
mensagem inteira.

**Este bug já aconteceu e era grave:** o `&` do próprio **link de afiliado** derrubava todo
post. Como o link vai em todo post, isso sozinho impediria o bot de publicar qualquer coisa.

**Solução:**

1. **Confira se o escape de HTML ainda está lá.** Abra o node `Format PT-BR Message` do
   Publisher e procure a linha que define `escHtml`. Ela precisa trocar `&` por `&amp;`,
   `<` por `&lt;` e `>` por `&gt;`. **Nunca remova essa função**, mesmo que pareça
   desnecessária.
2. **Se o problema é o link**, lembre que hoje ele vai no **botão inline**
   (`reply_markup`), e o botão não passa pelo interpretador de HTML. Se alguém mover o link
   de volta para o corpo do texto, o problema volta.
3. **Se o problema é o tamanho**, o limite de legenda de foto no Telegram é 1024 caracteres.
   O código já trata isso encurtando o título e remontando a legenda inteira — de propósito,
   porque cortar a legenda no meio poderia partir uma tag HTML e gerar exatamente este erro.
4. **Se o erro for sobre a foto** (algo como `wrong file identifier` ou
   `failed to get HTTP URL content`), o problema é a `thumbnail`, não o HTML. O Telegram não
   conseguiu baixar a imagem. Veja [P8](#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha),
   porque esse caso trava a fila.

---

## P5 — Credencial do banco para de conectar ("Couldn't connect with these settings")

**Sintoma:** ao testar a credencial "Pokemon Promos DB" no n8n, aparece
"Couldn't connect with these settings", mesmo com host, banco, usuário e senha
aparentemente corretos. Todos os nodes de banco começam a falhar de uma vez.

**Causa (a que já aconteceu):** o n8n e o PostgreSQL rodam em containers Docker separados e
só se encontram porque estão na **mesma rede Docker**, chamada `n8n_default`. Quando o
projeto do n8n é redeployado, o Docker **recria essa rede** — e o container
`pokemon-postgres`, que não foi redeployado, continua ligado à rede **antiga**, que já não
existe para o n8n. Os dois passam a ser vizinhos que não se enxergam.

O sintoma é traiçoeiro porque nada mudou na credencial: as configurações estão certas, é a
rede embaixo que se moveu.

**Solução:** redeployar o container do PostgreSQL para ele se reconectar à rede nova.
Um simples restart **pode não resolver**, porque restart não reavalia a configuração de
rede do docker-compose — é preciso recriar o projeto. Isso se faz pelo painel da Hostinger
ou pelas ferramentas de VPS, aplicando novamente a configuração do projeto
`pokemon-postgres`, que declara `networks: n8n_default` como rede externa.

Depois disso, volte à tela da credencial no n8n e clique em **Retry**.

**Regra prática que vale guardar: sempre que o n8n for atualizado ou redeployado, teste a
credencial do banco em seguida.**

**Causa alternativa, também real neste projeto:** falha de **senha**, não de rede — a
mensagem nesse caso é `password authentication failed for user "pokemon_bot"`. Aconteceu
porque a senha continha o caractere `$`, e o Docker Compose interpretou o que vinha depois
do `$` como nome de variável de ambiente, engolindo parte da senha. O container recebeu uma
senha diferente da que estava escrita no arquivo.

Se você precisar trocar a senha do banco algum dia: **evite `$` na senha**, ou escape como
`$$` no docker-compose. E lembre que a senha precisa ser atualizada em dois lugares — no
container e na credencial do n8n.

---

## P6 — Os workflows desapareceram do n8n

**Sintoma:** você abre o n8n e os workflows Pokemon simplesmente não estão mais na lista.

**Causa:** aconteceu de verdade neste projeto. Durante um redeploy do n8n, o volume Docker
que guarda os dados foi recriado, e os workflows criados poucos minutos antes se perderam.
Workflows mais antigos, de outros projetos, sobreviveram — o que faz suspeitar de uma janela
de tempo em que os dados novos ainda não tinham sido persistidos no volume.

**Solução:** infelizmente é recriar. Foi o que foi feito na época, e é por isso que os
workflows têm "v2" no nome.

**Prevenção — e é aqui que esta documentação vale mais:**

1. **Antes de qualquer mexida no n8n na VPS** (atualização de versão, mudança de env var,
   redeploy), exporte os três workflows. No n8n: abra o workflow, menu de três pontos no
   canto, **Download**. Guarde os arquivos JSON num lugar seguro. São segundos de trabalho
   que evitam horas de refação.
2. Se perder tudo, esta pasta de documentação é o material de reconstrução: as regras, os
   valores, os nomes dos nodes e o schema do banco estão todos aqui. O banco de dados fica
   num container separado com volume próprio, então **os dados não se perdem junto com os
   workflows**.

---

## P7 — Node vermelho reclamando de credencial

**Sintoma:** ao executar, um ou mais nodes ficam vermelhos com mensagem de credencial não
configurada ou de autenticação.

**Causa:** o node não tem credencial vinculada. Isso já aconteceu em escala neste projeto:
uma auditoria descobriu que **nenhum dos 16 nodes de banco dos três workflows** tinha
credencial vinculada. Nada nunca teria funcionado. É um erro fácil de acontecer quando
workflows são criados por programa, porque a credencial não vem junto automaticamente.

**Solução:** abra o node, encontre o campo **Credential to connect with** no topo e escolha:

- Nodes PostgreSQL → **"Pokemon Promos DB"**
- Node Telegram → **"Pokemon Telegram Bot"**

Depois salve o workflow.

**Nodes que merecem atenção especial agora:** os quatro nodes da trilha de revisão do
Scanner — `Insert Review`, `Queue Review`, `Log Review` e `Log Review Error` — foram
adicionados depois da última execução de teste e **nunca rodaram**. Vale abrir cada um e
conferir a credencial antes de ativar o bot.

---

## P8 — A fila travou: o mesmo item tenta publicar toda vez e falha

**Sintoma:** a fila tem itens `pending` que não diminuem. A cada 2 minutos aparece uma
execução do Publisher, sempre com o mesmo produto, sempre falhando. Ou o Publisher roda,
não dá erro, e simplesmente não publica nada mesmo com fila cheia.

**Causa:** o Publisher escolhe sempre o item de **maior desconto** da fila
(`ORDER BY discount_pct DESC LIMIT 1`). Se **aquele item específico** não puder ser
publicado, o status dele nunca muda para `posted` — e na execução seguinte a consulta
escolhe ele de novo. Ele fica eternamente na frente, bloqueando todos os outros.

> **Resolvido em 13/08/2026, nas duas causas conhecidas.** As duas coisas que travavam a
> fila — link de afiliado inválido e foto faltando — hoje são filtradas antes da escolha. O
> `Fetch Next Pending` só considera item que tenha `matt_word=caed1312314`, `matt_tool=96097202`
> e um `thumbnail` começando com `http`. Item fora desses critérios **nem é selecionado**: a
> fila passa por cima dele e continua andando.
>
> Ele fica parado em `pending`, de propósito, e é denunciado em `promos_erros` com
> `error_step = 'afiliado'` ou `'foto'` pelo node `Registrar Pendentes Impublicaveis`. Não
> adianta marcar como `blocked`: o caminho é corrigir o dado. Veja a
> [Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado) e a
> [Decisão 26](historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila).

**Se a fila travar mesmo assim,** é por um motivo novo — provavelmente uma foto que existe,
começa com `http`, mas que o Telegram não consegue baixar (link quebrado, imagem removida).
O sintoma é `error_step = 'post'` em `promos_erros`, vindo do `Log Publish Error`. A saída:

1. **Identifique o item do topo da fila** com a consulta "a próxima promoção que vai sair"
   da [seção 5 do runbook](runbook.md#5-conferir-o-que-foi-postado).
2. **Tire ele da frente**, marcando como bloqueado:

```sql
UPDATE promos
SET status = 'blocked', blocked_reason = 'foto existe mas o telegram nao baixa'
WHERE item_id = 'MLB1234567890';
```

3. Na próxima execução o Publisher pega o item seguinte e a fila volta a andar.

**Para ver quem está pendente e por que não sai:**

```sql
SELECT item_id,
       left(title, 60) AS titulo,
       discount_pct,
       (coalesce(thumbnail, '') NOT LIKE 'http%')          AS sem_foto,
       (utm_link IS NULL
        OR utm_link NOT LIKE '%matt_word=caed1312314%'
        OR utm_link NOT LIKE '%matt_tool=96097202%')       AS sem_afiliado
FROM promos
WHERE status = 'pending'
  AND (coalesce(thumbnail, '') NOT LIKE 'http%'
       OR utm_link IS NULL
       OR utm_link NOT LIKE '%matt_word=caed1312314%'
       OR utm_link NOT LIKE '%matt_tool=96097202%');
```

Nenhum dos dois trava a fila hoje. Os dois impedem **aquele item** de sair, até que o dado
seja corrigido: regrave o `utm_link`
([P16](#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos)) ou o
`thumbnail`.

---

## P9 — O banco gravou a expressão como texto literal

**Sintoma:** ao olhar a tabela `promos`, você vê valores como `{{ $json.item_id }}` gravados
literalmente, em vez do ID de verdade do produto.

**Causa:** no n8n, para que uma expressão `{{ ... }}` seja **calculada** em vez de tratada
como texto, o campo precisa estar em modo expressão — o que no código do workflow aparece
como um **sinal de igual (`=`) no começo** do valor. Sem esse `=`, o n8n manda a string
crua para o banco.

**Este bug aconteceu duas vezes neste projeto**, nas 7 consultas SQL do Scanner. Foi
corrigido, a correção se perdeu numa edição posterior, e teve de ser corrigido de novo. É o
erro mais fácil de reintroduzir sem perceber.

**Solução:**

1. Abra o node de banco e olhe o campo **Query**. No editor visual, campos em modo expressão
   têm um indicador diferente e mostram uma prévia do valor calculado abaixo.
2. Se você editar o workflow pela interface, escolha **Expression** (em vez de **Fixed**) no
   seletor do campo — o n8n cuida do `=` sozinho.
3. **Confira sempre depois de editar** rodando o workflow na mão e olhando o que foi gravado.

**Como saber quais nodes precisam do `=`:** só os que têm `{{ }}` na consulta. No Publisher,
por exemplo, `Count Today Posts` e `Fetch Next Pending` **não** precisam, porque as consultas
deles são fixas, sem expressão nenhuma. Já `Mark as Posted` e `Log Posted` precisam.

**Limpando a sujeira:** se linhas com texto literal foram gravadas, apague-as:

```sql
DELETE FROM promos     WHERE item_id LIKE '%{{%';
DELETE FROM promos_log WHERE item_id LIKE '%{{%';
```

---

## P10 — `access to env vars denied`

**Sintoma:** um node falha com a mensagem `access to env vars denied`, ou uma variação como
`Cannot assign to read only property 'name' of object 'Error: access to env vars denied'`.

**Causa:** alguém tentou usar `$env` para ler uma variável de ambiente. Esta instalação do
n8n tem `N8N_BLOCK_ENV_ACCESS_IN_NODE` ativo, que bloqueia isso em **qualquer** expressão do
n8n — não apenas em Code nodes, como se costuma supor.

**Solução:** não use `$env`. Coloque o valor direto no node, e **atualize a tabela de
parâmetros** em [regras-de-negocio.md](regras-de-negocio.md#mapa-rápido-onde-mora-cada-parâmetro)
para o próximo a mexer saber onde o valor mora.

**Por que não simplesmente liberar o `$env`:** desativar essa proteção afeta o **servidor
n8n inteiro**, não só este projeto — qualquer workflow passaria a poder ler todos os segredos
do servidor. Não vale a conveniência.

**Consequência que confunde:** existem variáveis como `ML_MIN_DISCOUNT` e `DAILY_POST_LIMIT`
definidas no docker-compose do n8n. Elas **não são lidas por node nenhum** e mudar seus
valores não muda absolutamente nada no comportamento do bot.

---

## P11 — Post sem link de afiliado

**Sintoma:** o post saiu no canal, mas o botão de compra leva para o Mercado Livre **sem** o
código de afiliado, ou o botão não aparece.

**Causa:** o link de afiliado é montado no **Scanner** e gravado na coluna `utm_link`. O
Publisher só usa o que está gravado. Então a falha pode estar em qualquer um dos dois lados.

**Este problema custou caro no passado, em duas versões diferentes:** primeiro o `utm_link`
não estava sequer sendo gravado no `INSERT`; depois, o Publisher usava a coluna `permalink`
em vez de `utm_link`. Nos dois casos os posts sairiam sem comissão nenhuma.

> **Desde 13/08/2026 este sintoma não deveria mais existir.** O Publisher só publica com
> `utm_link` contendo `matt_word=caed1312314` e `matt_tool=96097202`, e o fallback para
> `permalink` foi removido ([Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado)).
> Se mesmo assim sair um post sem código de afiliado, o problema é **grave e novo**: alguém
> mexeu na trava. Confira os três pontos da tabela de camadas na
> [seção 10 das regras de negócio](regras-de-negocio.md#10-link-de-afiliado). O sintoma que
> você deve esperar hoje é o oposto: **nada é publicado**, e `promos_erros` enche de
> `error_step = 'afiliado'` — o que significa que o Scanner está gravando o link errado.

**Solução:**

1. **Confira se está gravado no banco:**

```sql
SELECT item_id, left(title, 40) AS titulo, utm_link
FROM promos
WHERE status IN ('pending', 'posted')
ORDER BY created_at DESC
LIMIT 10;
```

O `utm_link` precisa conter **`matt_word=caed1312314&matt_tool=96097202`** — nessa ordem de
valores. Se vier `matt_word=MLB`, é o formato antigo e inválido: veja
[P16](#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos). Se estiver
vazio, o problema é no Scanner: confira se o `INSERT` do node `Insert Promo` inclui a coluna
`utm_link` e se as constantes `AFILIADO_APELIDO` e `AFILIADO_TOOL_ID` estão corretas na
função `montarLinkAfiliado`.

2. **Se está gravado mas o post sai errado**, o problema é no Publisher: o node
   `Format PT-BR Message` deve usar **só** o `utm_link` (nunca o `permalink`) e o node
   `Post to Telegram` deve apontar o botão para `{{ $json.buy_link }}`.

3. **Confira num post real:** clique no botão do canal e olhe a URL que abre.

---

## P12 — Produto classificado errado e que não volta mais

**Sintoma:** um produto foi bloqueado ou descartado por engano e, mesmo continuando na página
de ofertas, ele nunca mais é reavaliado.

**Causa:** não é defeito, é como a deduplicação funciona. A coluna `item_id` é única e os
`INSERT` usam `ON CONFLICT (item_id) DO NOTHING`. Assim que um produto tem uma linha em
`promos`, toda tentativa futura de regravá-lo é ignorada em silêncio — **a primeira
classificação vale para sempre**.

Isso é ótimo para não gerar post repetido, e ruim quando a primeira classificação estava
errada.

**Solução:** [seção 9 do runbook](runbook.md#9-liberar-um-produto-para-ser-reavaliado) tem
os dois caminhos — colocar direto na fila ou apagar a linha para o bot recapturar do zero.

**Se isso acontecer muito**, o problema real está nos limites do filtro de autenticidade;
vale calibrar em vez de corrigir item por item. As consultas para decidir com base em dados
estão em [runbook, seção 7](runbook.md#7-calibrar-os-filtros-olhando-os-dados), e os valores
a mexer em [regras-de-negocio.md](regras-de-negocio.md#mapa-rápido-onde-mora-cada-parâmetro).

---

## P13 — A fila vive vazia e o canal posta pouco

**Sintoma:** o bot funciona, não há erro, mas saem pouquíssimos posts por dia e a fila está
sempre em zero.

**Causa: provavelmente nada está errado.** O Store Scanner só vê a **vitrine** de cada loja
oficial (a Pokémon tem ~3 produtos na homepage). Com filtro de TCG + acessório + figura
Pokémon, mínimo 10%/15% e deduplicação, o volume **novo** por dia fica bem abaixo do teto de
**40** posts. Em 14/08 o Scanner aceitou ofertas que já estavam `posted` e a fila ficou em
zero — veja [P1, passo 4](#p1--o-bot-não-está-postando-nada). A página geral de ofertas
(`Pokemon Scanner v2`) rendia ~9 produtos por varredura e está **desligada**. O Catalog
Scanner existe e **fica inativo**: a listagem completa falhou no ScraperAPI em 16/08
([P19](#p19--catalog-scanner-a-listagem-do-ml-falha-no-scraperapi),
[Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).

Vale confirmar que é isso mesmo, e não filtro apertado demais ou workflow parado:

```sql
SELECT decision AS decisao, count(*) AS quantidade
FROM promos_log
WHERE created_at > now() - interval '3 days'
GROUP BY decision;
```

Se `descartado` e `bloqueado` dominarem, o filtro está pegando quase tudo e vale calibrar. Se
`duplicado` dominar, é o comportamento esperado: a mesma página sendo revarrida.

**Se quiser mais volume**, os caminhos estão no [roadmap](roadmap.md#mais-volume-de-ofertas):
adicionar mais URLs de ofertas, paginação, ou ampliar categorias. Nenhum deles é gratuito —
ampliar categoria traz ruído e exige filtro por palavra-chave, que hoje não existe porque a
URL já garante que tudo que chega é do nicho certo.

---

## P14 — Mexi no workflow e quebrou

**Sintoma:** funcionava, você editou algo, parou de funcionar.

**Solução — o checklist do que mais quebra neste projeto, em ordem:**

1. **Expressão SQL sem o `=`** → [P9](#p9--o-banco-gravou-a-expressão-como-texto-literal)
2. **Credencial desvinculada**, principalmente em node novo → [P7](#p7--node-vermelho-reclamando-de-credencial)
3. **Saídas do Switch trocadas.** O `Route by Decision` tem 5 saídas com ordem específica
   (0 aceito, 1 bloqueado, 2 erro de parser, 3 revisão, 4 padrão/descartado). Já houve um bug
   em que os três destinos estavam ligados na **mesma** saída, e cada produto era gravado
   como aceito, bloqueado e descartado simultaneamente.
4. **Saída de erro ligada na saída de sucesso.** Nodes como `Log Insert Error` e
   `Log Publish Error` devem estar ligados na **segunda** saída (a de erro, índice 1) do node
   anterior. Já estiveram na de sucesso, e o resultado era registrar erro em toda execução
   bem-sucedida.
5. **Escape de HTML removido** do `Format PT-BR Message` → [P4](#p4--post-falhando-com-erro-400-do-telegram)
6. **Uso de `$json` depois de um `INSERT`.** Depois de gravar no banco, os campos originais
   do item já não existem mais no `$json`. Os logs precisam ler explicitamente
   `$("Normalize and Classify").item.json`. Esse bug fez os logs gravarem decisão vazia.

**Antes de editar qualquer coisa:** exporte o workflow (menu de três pontos → **Download**).
É o seu desfazer.

**Depois de editar, sempre:** rode na mão ([runbook, seção 8](runbook.md#8-rodar-um-workflow-manualmente-sem-ativar))
e confira o resultado no banco. Editar e confiar é como este projeto acumulou 17 bugs de uma
vez em uma auditoria.

**Nota para quem edita por programa (agentes de IA):** a validação `validate_workflow`
disponível via MCP **só valida código do SDK**, não workflows que já existem no n8n. Quem
valida workflow existente é a validação embutida na própria operação de atualização. Não
confie num "validou" que não olhou o workflow real.

---

## P15 — O selo "Loja oficial" do Mercado Livre não significa "loja oficial da Pokémon"

**Sintoma:** um anúncio com cara de falsificação passa no filtro de autenticidade com score
alto, às vezes o maior da varredura. No anúncio aparece a marca "POKÉMON" e o selo
"Loja oficial".

**Causa:** os dois sinais são autodeclarados e não valem nada.

- A **marca** é preenchida por quem anuncia. Qualquer vendedor pode escrever "POKÉMON".
- O selo **"Loja oficial"** quer dizer apenas que aquele vendedor mantém uma loja oficial
  *na plataforma* — uma modalidade de conta do Mercado Livre. Não diz nada sobre ser a loja
  oficial da marca anunciada.

A evidência que fechou o caso, colhida de anúncios reais de cartas Pokémon em 12/08/2026:

| Marca declarada | Selo | Quem é o vendedor de verdade |
| --- | --- | --- |
| POKÉMON | Loja oficial | Lehadry Jóias |
| POKÉMON | Loja oficial | Lehadry Jóias |
| POKÉMON | Loja oficial | Vikn Comércio de Auto Peças |

Uma joalheria e uma loja de autopeças vendendo carta Pokémon "oficial". O bot estava dando
**+15 pontos** de autenticidade para título com `original/oficial/licenciado/autêntico` e
**+8 pontos** para menção a selo — ou seja, premiava exatamente o padrão que deveria
bloquear. Era um bug ativo, não uma hipótese.

**Solução — o que foi feito em 13/08/2026:**

1. **Os pontos positivos por marca declarada e por selo foram removidos** do
   `Normalize and Classify` no `Pokemon Scanner v2`. Hoje nenhum sinal autodeclarado soma
   ponto de autenticidade. Só reputação e volume de vendas do vendedor contam a favor, e
   esses o vendedor não escolhe.
2. **Criou-se a lista de bloqueio de vendedores** (`vendedores_bloqueados`), com esses dois
   nomes dentro. Quando o nome do vendedor aparece no card, ele é conferido contra a lista
   antes de qualquer pontuação. Detalhes em
   [runbook, seção 12](runbook.md#12-lista-de-bloqueio-de-vendedores).
3. **A penalidade por carta japonesa foi corrigida.** Antes, a palavra "japonesa" penalizava
   sozinha, o que é errado: carta japonesa legítima existe e colecionador valoriza. Agora a
   penalidade só entra na **combinação** de lote grande (10 ou mais unidades) com preço
   unitário implausível (abaixo de R$ 5).
4. **O escopo do projeto mudou** para publicar só da loja oficial da Pokémon. Esta
   investigação foi o principal motivo: na página geral de ofertas não há sinal confiável de
   autenticidade que dê para automatizar.

**Cuidado ao mexer:** a lista de vendedores é **de bloqueio apenas**. É tentador usá-la ao
contrário ("se o vendedor é conhecido, aprova"), mas só ~3% dos anúncios expõem o nome do
vendedor — a ausência não significa nada, e transformar isso em aprovação recria o mesmo bug
com outra roupa.

---

## P16 — RESOLVIDO: o link de afiliado estava com os parâmetros invertidos

> **Status: confirmado e corrigido nos dois scanners em 13/08/2026.** Fica registrado porque a
> fila gravada antes da correção ainda carrega o link velho, e porque é o tipo de erro que passa
> despercebido se voltar a acontecer.

**Sintoma:** nenhum, e é justamente esse o problema. Os posts saem normalmente, o botão leva ao
produto certo, e a URL até tem `caed1312314` dentro. **A compra acontece e a comissão não.**
Ninguém percebe olhando o canal — só o painel de afiliados vazio denuncia.

**A causa,** confirmada comparando o link do bot com dois links reais gerados no painel de
afiliados do Eduardo:

| Parâmetro | Bot (formato antigo, errado) | Formato correto |
| --- | --- | --- |
| `matt_word` | `MLB` | **`caed1312314`** — o apelido da conta de afiliado |
| `matt_tool` | `caed1312314` | **`96097202`** — o ID numérico da etiqueta |
| `matt_source` | `social` | não existe; foi removido |
| `forceInApp` | não tinha | `true` |
| `ref` | não tinha | blob assinado pelo servidor, **não dá para montar fora do painel** |

O apelido e a etiqueta estavam **trocados de lugar**. Sobre o `ref`: ele é assinado pelo
servidor do Mercado Livre e não pode ser reproduzido, mas a atribuição não depende dele — quem
identifica o afiliado é o par `matt_word` + `matt_tool`.

**O que já foi feito:** a função `montarLinkAfiliado` foi corrigida nos **dois** scanners
(`Extrair Ofertas das Lojas` no Store Scanner e `Normalize and Classify` no Scanner v2). Toda
promoção coletada a partir de 13/08/2026 já nasce com o link certo.

**O que a correção do código NÃO resolve:** os itens que já estavam na fila. O Publisher usa o
`utm_link` **gravado no banco**, então quem foi coletado antes ainda tem o link velho. Para
conferir e corrigir:

```sql
-- 🟢 quantos itens da fila ainda estão no formato antigo
SELECT status, count(*) FILTER (WHERE utm_link LIKE '%matt_word=MLB%') AS formato_antigo
FROM promos GROUP BY status;
```

```sql
-- 🟡 regrava o link de afiliado dos itens que ainda não foram publicados
UPDATE promos
SET utm_link = split_part(permalink, '?', 1)
              || '?matt_word=caed1312314&matt_tool=96097202&forceInApp=true'
WHERE status = 'pending'
  AND coalesce(permalink, '') <> '';
```

**Depois de regravar:** religar o `Pokemon Publisher v2`, conferir a URL de um post real
clicando no botão do canal, e — o teste que realmente vale — confirmar no painel de afiliados
que o clique foi atribuído.

---

## P17 — Documento ilegível, salvo em UTF-16 pelo PowerShell

**Sintoma:** um arquivo `.md` desta pasta abre embaralhado, ou aparece com um espaço entre cada
letra, ou tem os acentos trocados por losangos. Ferramentas de busca acham o texto em uns
arquivos e não acham em outros, sem explicação aparente.

**Causa:** o arquivo foi salvo em **UTF-16, sem BOM**. Isso acontece sozinho no Windows: o
`Out-File` e o `>` do PowerShell 5.1 gravam em UTF-16LE por padrão. Sem o BOM no começo, nada
avisa o editor de que o arquivo não é UTF-8, e o resultado é lixo na tela. Aconteceu de verdade
em 13/08/2026 com `arquitetura.md` e `regras-de-negocio.md`, e por um tempo a suspeita recaiu
sobre o arquivo errado.

**Como detectar:** um arquivo UTF-16 tem um byte `00` a cada dois. No Node:

```js
const b = require('fs').readFileSync('docs/arquitetura.md');
console.log([...b].filter((x) => x === 0).length); // muito acima de zero = UTF-16
```

**Solução:** reler como UTF-16 e regravar como UTF-8, conferindo que o texto sobreviveu:

```js
const fs = require('fs');
const f = 'docs/arquitetura.md';
let s = fs.readFileSync(f).toString('utf16le').replace(/\r\n/g, '\n');
if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
fs.writeFileSync(f, Buffer.from(s, 'utf8'));
```

**Como evitar:** ao gerar arquivo pelo PowerShell, sempre passe o encoding explicitamente —
`Set-Content -Encoding utf8` — ou grave pelo Node/editor. E vale conferir o resultado depois:
uma ferramenta de edição pode reescrever o arquivo no mesmo encoding esquisito em que o
encontrou, desfazendo a conversão sem avisar.

---

## P18 — Salvar não é publicar: a produção roda a versão publicada

**Sintoma:** você corrigiu um Code node, salvou, o editor mostra o código novo — e o bot
continua se comportando como antes. As execuções agendadas insistem no bug que você já
consertou.

**Causa:** neste n8n, cada workflow tem **duas versões ao mesmo tempo**:

| Versão | Campo | Quem usa |
| --- | --- | --- |
| A que você editou e salvou | `versionId` | o editor e a execução manual |
| A que está no ar | `activeVersionId` | o agendador, ou seja, a produção |

Salvar mexe só na primeira. Enquanto você não clicar em **Publish**, o agendador segue
rodando a versão antiga, e nada na tela avisa isso.

Aconteceu de verdade em 13/08/2026: a correção do link de afiliado ficou salva no
`Pokemon Store Scanner` por horas enquanto a produção continuava gerando o link no formato
errado ([Decisão 25](historico-de-decisoes.md)). O sintoma era desconcertante — o código
certo na tela e o dado errado no banco.

**Como conferir:** compare os dois campos. Se forem diferentes, a produção está atrasada.
Pelo MCP do n8n, `get_workflow_details` devolve os dois:

```js
// versionId === activeVersionId  → produção com a versão atual
// activeVersionId === null       → nunca foi publicado
```

Pela interface, o indicador é o botão **Publish** continuar disponível/destacado depois de
salvar.

**Não confie só no ID.** Ele diz que as duas versões são a mesma, não diz o que a versão
publicada contém. Para uma mudança que importa — como a trava de afiliado — abra a versão
ativa e procure o node pelo nome, ou olhe uma execução real e confira se o node aparece no
caminho percorrido. Execução é a prova final: node que não existe na versão publicada não
aparece no histórico.

**Solução:** publicar o workflow e rodar de novo. Depois disso, conferir uma execução
agendada (não a manual) para ver o comportamento novo valendo.

**Como evitar:** trate "publicar" como parte de "editar", nunca como passo separado. O
runbook traz o passo prático nas
[seções 1](runbook.md#1-ligar-e-desligar-o-bot) e
[8](runbook.md#8-rodar-um-workflow-manualmente-sem-ativar).

---

## P19 — Catalog Scanner: a listagem do ML falha no ScraperAPI

**Sintoma:** execução manual do `Pokemon Catalog Scanner` (`2ckVyvFPvtqwECDI`) termina com
HTTP 500 no node `Baixar Catalogo da Loja`. O parser não vê produtos. Corpo ~208 bytes,
texto *“Protected domains may require premium=true OR ultra_premium=true”*.

**Causa:** `lista.mercadolivre.com.br` exige renderização JavaScript. Em 13/08 a página 1
passou só com `render=true` (10 créditos). Em 16/08 a **mesma página 1** falhou com `render`
e com `premium=true` (~56 s, **sem** cobrar). O parser `_n.ctx.r` nunca viu HTML nessa
sessão. Se o campo **Name** da credencial Query Auth não for `api_key`, a falha é HTTP 404
em ~1,6 s — outro problema.

**Solução:** **não publique** esse workflow. Store Scanner de 5 min segue no ar. Para
retomar: Name = `api_key`, `TESTE_SO_POKEMON = true`, uma execução **manual** só de
`pokemon`. HTTP 200 com `_n.ctx.r` e produtos = avançar; 208 bytes / 500 = parar.
`ultra_premium` (75 créditos, plano pago) **só com pedido novo**.

Registro: [Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo).

---

## P20 — O painel da réplica abre, mas nada funciona

**Sintoma:** GET `/webhook/replica/painel` devolve 200 com Basic Auth, a página pinta, e
mesmo assim clique, rota e save não respondem. No “ver código-fonte” o HTML **acaba no
meio de um `<script>`**, sem `</body>` nem `</html>`.

**Causa:** `replica_config.pagina_gz` estava **pela metade** (31712 de 63424 bytes). O node
`Montar Pagina` só decodifica o que está no banco. Cache do Chrome também mostra a versão
cortada depois do conserto.

**Solução:** conferir o tamanho no banco (`length(pagina_gz)` = 63424, MD5
`f8fccee12aa8e6e98ecf12d2a7221d2a`). Se estiver curto, regravar o base64 do arquivo
[`backups/2026-08-28/painel/replica-painel.html`](../backups/2026-08-28/painel/replica-painel.html).
Depois, **Ctrl+F5**. Sem Basic Auth o n8n responde “Authorization is required!” — isso é o
GET, não o HTML.

Registro: [Decisão 51](historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz).

---

## P21 — A réplica publica sem a foto do produto

**Sintoma:** o post sai no Telegram/WhatsApp só com texto, mesmo com link de produto do
Mercado Livre. No n8n a execução termina em `Marcar Como Enviado` e passa por
`Publicar Texto no Telegram` em vez de `Publicar Foto no Telegram`.

**Causa 1 (02/09 de manhã):** a origem quase sempre vem sem `imageMessage`. O
`Preparar Card` só ligava foto quando `tem_imagem` era true, e o ramo `Tem Foto do ML?`
estava no canvas sem conexão.

**Causa 2 (02/09 à tarde, execução `65110`):** o ramo ML foi ligado e buscou a página
`/p/` do produto. A VPS recebeu HTML de `suspicious-traffic-frontend`. `Normalizar URL
da Foto` ficou com `tem_url_foto = false`. A origem não tinha foto. Saiu texto. O HTML
do encurtador (`Seguir Redirecionamento 2`) **já tinha** o polycard do produto.

**Solução:** o ingest `c16c7118` tira a foto do polycard do HTML do `meli.la` (`url_foto_html`),
não da página `/p/`. Conferir numa execução **nova** (hash `chat_id|message_id` impede
replay) **depois** do delay (~8 s):

1. `Montar Post` → `url_foto_html` em `http2.mlstatic.com` (não vazio).
2. `Preparar Card` → `fonte_foto = html`, `tem_url_foto = true`.
3. `Tem Foto Para Copiar?` verdadeiro → `Tem Foto do ML?` verdadeiro →
   `Normalizar URL da Foto` (**sem** `Buscar Item no Mercado Livre`).
4. `Baixar Foto do Anuncio` → `Publicar Foto no Telegram` (e WhatsApp, se houver destino).

Se `url_foto_html` vier vazio, o fluxo ainda tenta a página `/p/` e depois a foto da
origem. `Buscar Item` devolvendo `account-verification` / `suspicious-traffic` é o
esperado na PDP; não use o `og:image` da vitrine `/social/`.

Registro: [Decisão 52](historico-de-decisoes.md#decisão-52--foto-oficial-do-anúncio-mesmo-quando-a-origem-veio-só-com-texto).
