# Histórico de decisões

Este arquivo existe por um motivo prático: **impedir que alguém no futuro — inclusive um
agente de IA — refaça caminhos já descartados.** Várias das decisões abaixo custaram horas
de investigação, e algumas delas parecem "óbvias de tentar" para quem chega sem contexto.

Cada decisão traz: o que foi decidido, o que foi tentado antes, por que falhou, e o que
mudaria a decisão.

**Números vigentes** (ritmo, lojas, teto, desconto mínimo) estão em
[regras-de-negocio.md](regras-de-negocio.md) e no [README](../README.md). As decisões mais
antigas abaixo podem citar 10 min / 5 min / teto 30 / duas lojas — isso era verdade **na
hora em que foram escritas**. A última operacional da curadoria é a [Decisão 43](#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora);
da réplica, a [Decisão 52](#decisão-52--foto-oficial-do-anúncio-mesmo-quando-a-origem-veio-só-com-texto).

---

## Decisão 1 — A API oficial do Mercado Livre está descartada

**A decisão:** o bot **não usa a API do Mercado Livre**. A fonte de dados é scraping da
página de ofertas.

**O que foi tentado:** o endpoint oficial de busca,
`GET https://api.mercadolibre.com/sites/MLB/search?q=pokemon+tcg`. Era o plano original do
projeto, e por muito tempo foi a arquitetura pretendida.

**Por que falhou:** o endpoint responde **403 Forbidden**, com um erro de política
(`PA_UNAUTHORIZED_RESULT_FROM_POLICIES`). O Mercado Livre fechou esse endpoint por decisão
de política em 2025. Não é rate limit, não é falta de chave.

**A parte importante, que evita perder tempo de novo:** foi **comprovado que não é bloqueio
de endereço de rede (IP)**. Do mesmo servidor, no mesmo momento, o endpoint
`GET https://api.mercadolibre.com/sites/MLB/domain_discovery/search` respondeu **200 sem
token nenhum**. Ou seja: a API responde bem para este servidor; ela só recusa **aquele
endpoint específico**, para qualquer um.

Um diagnóstico anterior tinha concluído "o IP da VPS está bloqueado" — **esse diagnóstico
estava errado**, e ele mandou o projeto atrás de proxies e serviços pagos sem necessidade.

**E OAuth resolveria?** Não. A documentação e os relatos de desenvolvedores mostram que a
busca retorna 403 **mesmo com token de usuário válido** obtido por Authorization Code. Só
aplicações com aprovação comercial específica do Mercado Livre passam por ali.

**E a API de afiliados?** **Não existe API pública de afiliados do Mercado Livre.** O
programa de afiliados funciona pelo painel web e por parâmetros na URL — que é exatamente o
que o bot faz ao montar o `utm_link`.

**O que mudaria essa decisão:** o Mercado Livre reabrir o endpoint publicamente, ou o Eduardo
conseguir aprovação comercial de uma aplicação. Nada disso está no horizonte. **Antes de
tentar de novo, teste o endpoint com `curl` e veja se ainda dá 403** — é um teste de 30
segundos que economiza horas.

---

## Decisão 2 — A fonte é a página de ofertas, não a página de busca

**A decisão:** a URL usada é `https://www.mercadolivre.com.br/ofertas?category=MLB6899`.

**O que foi tentado:** a página de busca (`lista.mercadolivre.com.br`), que seria o caminho
natural, permitindo buscar por termos como "booster box" e "elite trainer box".

**Por que falhou:** a página de busca **tem proteção anti-bot**. A partir da VPS, ela devolve
uma página de "suspicious traffic" em vez do conteúdo.

**Por que a de ofertas funciona:** simplesmente **não tem esse anti-bot**. Ela respondeu 200
direto da VPS, sem autenticação, sem proxy e sem conta em serviço nenhum, retornando 9
promoções reais com preço, preço original e desconto. A descoberta foi o que destravou o
projeto — e a solução é gratuita e sem dependência de terceiros.

**O custo dessa escolha:** perde-se a busca por termos. O bot vê **só o que o Mercado Livre
escolheu colocar na vitrine de ofertas** daquela categoria, cerca de 9 produtos por
varredura. Em troca, tudo que chega já é do nicho certo — a categoria é filtrada pelo próprio
servidor do Mercado Livre —, e por isso **não existe filtro de categoria nem de palavra-chave
no parser**.

**O que mudaria essa decisão:** o anti-bot chegar à página de ofertas (veja
[troubleshooting P3](troubleshooting.md#p3--o-anti-bot-do-mercado-livre-voltou)), ou a
necessidade de muito mais volume.

---

## Decisão 3 — A categoria correta é `MLB6899`

**A decisão:** a categoria é `MLB6899` — Cartas Colecionáveis T.C.G.

**O erro que existia:** o projeto usava `MLB2713` como "categoria Card Games". **Essa
categoria não existe** — a API do Mercado Livre responde "Category not found" para ela.

**Por que isso era grave e invisível:** o parser antigo filtrava produtos pela categoria. Com
uma categoria inexistente na lista de permitidos, o bot **descartaria 100% dos produtos, em
silêncio**, sem erro nenhum. Um bot que roda perfeitamente e nunca posta nada é muito mais
difícil de diagnosticar do que um bot que quebra.

**A lição prática:** quando um filtro descarta tudo, desconfie do filtro antes de desconfiar
da fonte.

**Decisão de escopo tomada junto:** manter **só cartas**. Foi avaliado ampliar para
Brinquedos e Hobbies (`MLB1132`) filtrando por "pokémon" no título, o que pegaria fichários,
álbuns, pokébolas e lotes. O Eduardo escolheu ficar só em cartas: zero ruído, 100% do nicho,
uma requisição por ciclo. O canal posta menos, mas só o que interessa.

---

## Decisão 4 — Dois workflows separados, com o banco no meio

**A decisão:** um workflow busca e classifica (`Scanner`), outro publica (`Publisher`), e
eles se comunicam **só pelo banco de dados**.

**A alternativa descartada:** um workflow único que busca e publica na mesma execução. Seria
mais simples de montar.

**Por que separar:** ritmos diferentes (varrer devagar, publicar espaçado), falha isolada
(Mercado Livre fora do ar não impede publicar o que já está na fila, e Telegram fora do ar
não impede captar), diagnóstico direto ("não entra nada" é Scanner; "não sai nada" é
Publisher), e controle fino de ritmo com 1 post por execução.

**O custo:** o estado precisa viver fora dos workflows. É exatamente o papel da tabela
`promos` como fila.

---

## Decisão 5 — Preços em centavos inteiros

**A decisão:** todos os preços no banco são inteiros em centavos. R$ 38,29 é gravado `3829`.

**Por quê:** número decimal em computador tem erro de arredondamento. Num bot que calcula
desconto e "você economiza R$ X", isso apareceria como centavo errado no post público. Com
inteiro, a conta é exata sempre. A conversão para reais acontece só na hora de exibir.

**Decisão relacionada:** `discount_pct` é `NUMERIC(5,2)`, não inteiro. Um desconto de 15,85%
viraria 15% ou 16% se fosse inteiro, e isso muda se o produto passa ou não pelo corte de
15%.

---

## Decisão 6 — Parâmetros fixos nos nodes, não em variáveis de ambiente

**A decisão:** os valores de negócio (faixa de desconto, teto diário, ID de afiliado,
categoria) estão escritos **dentro dos nodes**.

**O que foi tentado:** guardar tudo em variáveis de ambiente do n8n e ler com `$env`, para
ter um lugar único de configuração. Era a intenção original, e foi de fato implementada.

**Por que falhou:** esta instalação do n8n tem `N8N_BLOCK_ENV_ACCESS_IN_NODE` ativo, que
bloqueia `$env` com o erro `access to env vars denied`. Foi testado e confirmado: o bloqueio
vale para **qualquer** expressão do n8n, não só para Code nodes — o que é uma suposição comum
e errada.

**Por que não liberar:** essa proteção existe para que nenhum workflow possa ler todos os
segredos do servidor. Desativá-la afeta o **n8n inteiro**, não só este projeto. Não vale a
conveniência.

**O preço a pagar, e a mitigação:** os valores ficam espalhados, e sem documentação seria
preciso caçar cada um. Por isso a tabela "onde mora cada parâmetro" em
[regras-de-negocio.md](regras-de-negocio.md#mapa-rápido-onde-mora-cada-parâmetro) é o
artefato mais importante desta documentação para a operação do dia a dia.

**Pegadinha herdada:** as variáveis (`ML_MIN_DISCOUNT`, `DAILY_POST_LIMIT`,
`TELEGRAM_CHANNEL_ID` e outras) **continuam definidas** no docker-compose do n8n, mas
**nenhum node as lê**. Elas são decorativas e enganam quem chega depois.

---

## Decisão 7 — Cupons são manuais, de propósito

**A decisão:** cupons ficam numa tabela do banco, alimentada à mão pelo Eduardo. O Publisher
consulta e inclui no post só se houver cupom válido.

**O que foi pesquisado:** se havia forma confiável de automatizar cupons do Mercado Livre.

**O que a pesquisa mostrou:**

- O Mercado Livre **não tem API pública nem feed estável de cupons**.
- Os cupons são majoritariamente **por conta de usuário** — a Central de Cupons mostra o que
  está disponível para *aquele* usuário logado. Um código válido para o Eduardo pode
  simplesmente não existir para o assinante do canal.
- O cupom de primeira compra é automático no checkout e só vale para CPF sem histórico.
- Cupons são por campanha sazonal e por categoria.
- Afiliados recebem os cupons digitáveis pelos canais oficiais do ML (grupos de Telegram e
  WhatsApp para criadores) e repostam **na mão**.
- Agregadores (Cuponomia, Cupomvalido, Pelando) não expõem feed público do ML e mudam de
  layout com frequência. Ferramentas que tentam isso dependem de copiar cookie de sessão,
  que expira.

**O raciocínio decisivo:** raspar agregador entregaria, mais cedo ou mais tarde, **cupom
vencido ou inválido no post** — que é exatamente o que destrói a credibilidade de um canal de
promoções. O objetivo do projeto é credibilidade, então automatizar aqui trabalharia contra o
objetivo. Um campo manual custa uma linha de SQL quando o ML anuncia campanha, e **nunca
mente**.

**A proteção embutida:** a consulta do Publisher filtra por `ativo = TRUE` e prazo em dia. Se
a tabela estiver vazia ou todos os cupons estiverem vencidos, o post simplesmente sai sem
linha de cupom. **Cupom vencido nunca vai ao ar, mesmo que fique esquecido cadastrado.**

**O que mudaria essa decisão:** o Mercado Livre lançar uma API de cupons de afiliado. Nada
menos que isso.

**Atualização 13/08/2026:** o Eduardo autorizou o primeiro cupom real. `BRINQUEDOS` entrou
como cupom **ML público de campanha** (não de loja), válido até 16/08/2026. Detalhe na
[Decisão 32](#decisão-32--cupom-brinquedos-é-campanha-pública-do-ml-até-1608).

---

## Decisão 8 — Filtro de autenticidade por score, com três desfechos

**A decisão:** cada produto recebe uma pontuação de autenticidade que combina sinais do
título, plausibilidade do preço unitário e reputação do vendedor. Três desfechos possíveis:
bloqueado, aceito, ou **fila de revisão humana**.

**O que motivou:** o bot publicou no canal um **"Kit 5 Cartas Pokémon Ultra Raras Japonesas -
Brilhantes Ex V"** por R$ 38,29. Lote de cartas "ultra raras brilhantes japonesas" a preço
baixo é o padrão clássico de réplica chinesa vendida no Mercado Livre. O filtro de então só
olhava desconto. O Eduardo foi explícito: *"não quero fazer com cartas falsas, materiais
falsos"*.

**A alternativa descartada — lista de palavras proibidas.** Simples de implementar, mas
título de anúncio é ruidoso: erraria nos dois sentidos. Bloquearia "Booster Box original com
carta brilhante" e liberaria réplica que não usa nenhuma palavra da lista.

**Por que score combinado:** permite que sinais fortes (Copag, produto lacrado) compensem
sinais fracos, e que a combinação de vários indícios fracos (lote grande + raridade alta +
japonês + preço unitário baixo) condene um produto que nenhum indício sozinho condenaria.

**Por que teto nos sinais positivos:** vendedor de produto falsificado **também escreve
"original" e "oficial" no anúncio**. Sem teto, seria fácil empilhar palavras bonitas e furar
o filtro. O teto é 55, e só a menção à Copag vale 45 dele — porque a Copag é a distribuidora
licenciada oficial no Brasil e é o sinal mais difícil de falsificar.

**Por que três desfechos e não dois:** este é o coração da decisão. **Na dúvida, não posta.**
Credibilidade vale mais que volume. Um produto ambíguo poderia ser real, e bloquear
perderia uma promoção boa; mas publicar uma falsificação custa a confiança do canal, que é o
ativo do projeto. A fila `promos_review` resolve o dilema transferindo a decisão para o
humano, sem risco.

**Também não é IA — e isso foi deliberado.** O plano original previa um agente de IA
(DeepSeek v4) para essa classificação. O filtro atual é determinístico, por regras. A
vantagem: é auditável (o motivo completo fica gravado em texto), é grátis, é instantâneo e
não depende de serviço externo. IA continua no [roadmap](roadmap.md#análise-com-ia) como
camada adicional, não como substituta.

**Estado atual:** implementado no node `Normalize and Classify`, **mas ainda não executado
nenhuma vez**. Foi adicionado depois da última execução de teste.

---

## Decisão 9 — Link de afiliado no botão, não no texto

**A decisão:** o link de compra vai num **botão inline** do Telegram, e não como link no
corpo da mensagem.

**Por quê, na origem:** estética. Botão parece mais profissional que link solto no meio do
texto.

**O ganho inesperado, que virou o motivo principal:** o `reply_markup` (a estrutura que
define o botão) **não passa pelo interpretador de HTML** do Telegram. O `&` do link de
afiliado, que antes derrubava o post com erro 400, deixou de ser risco.

**O escape de HTML continua obrigatório** para o título e a descrição do cupom, que vão no
texto. Um título de produto com `&` ainda quebraria o post.

**A regra que veio junto:** item **sem link** não é publicado, porque o botão exigiria uma
URL válida. Consequência operacional relevante: como a fila é ordenada por desconto, um item
sem link no topo trava a fila — veja
[troubleshooting P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha).

---

## Decisão 10 — Reputação neutra não aparece no post

**A decisão:** quando a nota do vendedor é 3.0 e as vendas são 0, a linha do vendedor
desaparece da mensagem.

**Por quê:** `3.0 / 0 vendas` é o **valor padrão de "não consegui ler o dado"**, não uma
medição real. A página de ofertas não traz reputação estruturada; o parser tenta extrair de
um texto e, quando falha, usa esse padrão neutro em vez de quebrar.

Mostrar "Vendedor: nota 3.0/5 · 0 vendas" num post passaria uma desconfiança que o dado nem
sustenta. Melhor não dizer nada do que dizer algo enganoso.

O mesmo valor padrão **é usado como penalidade** no filtro de autenticidade (vendedor sem
reputação publicada perde pontos), o que é coerente: internamente a ausência de dado é um
sinal, externamente não é informação.

---

## Decisão 11 — Detectar a quebra do parser em vez de falhar em silêncio

**A decisão:** quando o parser não consegue extrair produtos, ele **grava um erro explícito**
em `promos_erros`, com diagnóstico.

**Por quê:** o bot depende do formato do HTML de um site que não deve nada a ele. Um dia esse
formato vai mudar. Sem essa detecção, o sintoma seria "o bot roda todo dia, sem erro, e nunca
posta nada" — o pior tipo de falha, porque parece que está tudo bem.

**O que é registrado:** o motivo, se o anti-bot voltou, o tamanho do HTML recebido, quantos
cards brutos foram encontrados, qual estratégia de parsing foi usada, e um **trecho de 600
caracteres** da página. Com isso dá para diagnosticar sem precisar reproduzir o problema.

**O efeito colateral bom:** a tabela `promos_erros` virou o painel de saúde do bot. Vazia
significa que tudo vai bem. É a única coisa que o Eduardo realmente precisa olhar de vez em
quando.

---

## Decisão 12 — Deduplicação por `ON CONFLICT`, não por consulta prévia

**A decisão:** `INSERT ... ON CONFLICT (item_id) DO NOTHING`, com `item_id` único.

**A alternativa descartada:** consultar antes ("esse produto já existe?") e só inserir se
não existir.

**Por quê:** o banco faz isso melhor. Uma única ida ao banco em vez de duas, e sem risco de
duas execuções simultâneas inserirem o mesmo produto entre a consulta e a gravação.

**A consequência que precisa ser conhecida:** a primeira classificação de um produto **vale
para sempre**. Um item bloqueado hoje não é reavaliado amanhã, mesmo com preço melhor. Evita
post repetido, mas impede segunda chance. Documentado em
[troubleshooting P12](troubleshooting.md#p12--produto-classificado-errado-e-que-não-volta-mais).

**Decisão relacionada, corrigida no caminho:** o plano previa uma restrição composta
`UNIQUE (item_id, status)`. Ela **não foi implementada**, e é bom que não tenha sido: com ela,
o `ON CONFLICT (item_id)` não funcionaria, e o mesmo produto poderia coexistir como `pending`
e como `blocked`.

---

## Decisão 13 — Publicar 1 item por execução, do maior desconto para o menor

**A decisão:** `ORDER BY discount_pct DESC LIMIT 1`, a cada 5 minutos.

**A alternativa descartada:** publicar em lote (5 por execução, com intervalo maior).

**Por quê:** um por vez faz cada publicação ser um evento isolado — se uma falha, não
arrasta as outras. E mudar o ritmo do canal passa a ser só mudar o relógio, sem tocar em
lógica nenhuma.

**Por que maior desconto primeiro:** a melhor promoção da fila sai antes, e não a que chegou
antes. Promoção boa é perecível.

**A ressalva registrada:** com 5 minutos e janela de 14 horas, o teto de 30 posts virou o
freio principal. Em dia de muitas ofertas o bot pode despejar os 30 posts nas primeiras
horas e ficar mudo o resto do dia. A decisão consciente foi **não mexer nisso agora** e
observar o comportamento real primeiro. Se incomodar, a solução certa é espaçar por horário,
não aumentar o intervalo — porque aumentar o intervalo também atrasaria as promoções boas.

---

## Decisão 14 — Post sem hashtags

**A decisão do Eduardo:** remover a linha `#PokemonTCG #CartasPokemon #Promocao` do fim do
post. O argumento: *"o formato está bom, mas não precisa colocar hashtags no final, não é
útil"* — e ele está certo, hashtag em canal do Telegram não gera descoberta como em rede
social, só ocupa espaço.

**Estado: aplicado** em 12/08/2026. O node `Format PT-BR Message` já não monta essa linha, e
o post termina no aviso de que preço e estoque podem mudar. O único post real publicado no
canal, do teste de ponta a ponta, ainda saiu com as hashtags — foi anterior à mudança.

---

## Decisão 15 — Espera aleatória antes de acessar o Mercado Livre

**A decisão:** entre o relógio do Scanner e a requisição à página de ofertas existe um node
`Random Jitter`, do tipo *Wait*, que para o fluxo por um tempo sorteado entre 0 e 60
segundos.

**O porquê:** a varredura passou de 45 para 10 minutos, para as promoções chegarem mais
rápido à fila. Só que frequência maior aumenta o risco de o Mercado Livre reconhecer o
padrão. Um acesso que chega exatamente em minutos redondos, com precisão de relógio, é a
assinatura clássica de robô. Sorteando um atraso, os horários ficam irregulares.

**O trade-off aceito:** cada execução do Scanner passa a demorar até um minuto a mais, e o
intervalo real entre varreduras varia de ~9 a ~11 minutos. Nenhum dos dois tem custo
prático, e é bem mais barato que contratar proxy.

**A alternativa descartada** foi manter o intervalo alto (45 minutos) para não chamar
atenção. Perdia promoção boa, que em carta Pokémon esgota rápido. O jitter dá a frequência
alta com parte da discrição.

---

## Decisão 16 — Nenhum sinal autodeclarado soma ponto de autenticidade

**A decisão:** marca declarada no anúncio, selo "Loja oficial" do Mercado Livre e palavras
como "original", "oficial", "licenciado" e "autêntico" no título **não valem ponto positivo**
no score de autenticidade. Só conta a favor o que o vendedor não escolhe (reputação, volume
de vendas) e nomes de linha de produto selada.

**O porquê:** uma investigação em 12/08/2026 colheu anúncios reais de cartas Pokémon com
marca "POKÉMON" e selo "Loja oficial" cujos vendedores eram **Lehadry Jóias** (uma joalheria)
e **Vikn Comércio de Auto Peças** (uma loja de autopeças). No Mercado Livre, "Loja oficial"
significa apenas que o vendedor tem uma conta de loja oficial na plataforma; não diz nada
sobre a marca. E a marca em si é preenchida por quem anuncia.

O bot dava **+15** por `original/oficial/licenciado/autêntico` e **+8** por menção a selo.
Ou seja: **premiava exatamente o padrão da falsificação que deveria bloquear.** Era um bug
ativo, não um risco teórico. Foi removido em 13/08/2026.

**O trade-off aceito:** anúncios legítimos que dependiam dessas palavras para chegar aos +25
de aprovação agora caem em `revisao` em vez de entrar direto na fila. É o lado certo do erro:
revisão humana custa tempo, post de falsificação custa o canal.

**A alternativa descartada** foi reduzir o peso em vez de zerar (de +15 para +3, por
exemplo). Não resolve: o falsificador continua ganhando um empurrão de graça, e um sinal que
qualquer um pode escrever de graça não é sinal.

---

## Decisão 17 — Lista de vendedores é de bloqueio, nunca de aprovação

**A decisão:** a tabela `vendedores_bloqueados` só serve para rejeitar. Estar fora dela não
aprova ninguém.

**O porquê:** o nome do vendedor aparece em cerca de **3%** dos anúncios da página de
ofertas. Com essa cobertura, "não está na lista de bloqueio" é quase sempre só falta de
informação, não um atestado. Usar a mesma tabela ao contrário — uma lista de vendedores
confiáveis que aprova automaticamente — recriaria o bug da Decisão 16 com outra roupa: um
sinal fraco virando aprovação.

**Por que em tabela e não fixo no código:** para o Eduardo bloquear um vendedor novo com uma
linha de SQL, sem abrir workflow nem mexer em JavaScript. O Scanner lê a lista no começo de
cada varredura.

---

## Decisão 18 — Idioma só aparece no post quando a detecção é confiável

**A decisão:** o Scanner detecta o idioma da carta pelo título e grava em `promos.idioma` e
`promos.idioma_confianca`. O Publisher **só imprime** a linha de idioma quando a confiança é
maior ou igual a **0,85**. Nos casos `ambiguo` (duas línguas no mesmo título) e
`desconhecido`, a linha simplesmente não aparece.

**O porquê:** o Mercado Livre costuma anexar o idioma no fim do título, o que torna a
detecção por palavra-chave confiável — acertou 11 de 11 num teste com títulos reais. Mas
quando o título mistura línguas, não há como saber. Afirmar o idioma errado de uma carta é o
tipo de erro que colecionador percebe na hora e que custa credibilidade; omitir a linha não
custa nada.

**A alternativa descartada** foi mostrar sempre, com um "provavelmente" nos casos duvidosos.
Polui o post e transfere a dúvida para o leitor, que é justamente quem não pode resolvê-la.

---

## Decisão 19 — Só a loja oficial da Pokémon, por enquanto

**A decisão do Eduardo, em 13/08/2026:** o bot só publica promoções que aparecem dentro de
<https://www.mercadolivre.com.br/loja/pokemon>. A página geral de ofertas saiu de escopo, e
o `Pokemon Scanner v2` foi **desativado** por causa disso — preservado inteiro, não apagado.

**O porquê:** é a conclusão natural da Decisão 16. Fora da loja oficial da marca, não existe
sinal de autenticidade confiável o bastante para automatizar: marca e selo são
autodeclarados, o nome do vendedor quase nunca aparece, e o score acerta bem mas não o
suficiente para deixar sem supervisão. Dentro da loja oficial o problema não existe na
origem — tudo que está lá é original. Trocar filtragem estatística por uma fonte confiável é
mais barato e mais seguro.

**O que foi feito com a fila que já existia:** os itens vindos da fonte antiga foram
marcados como `descartado`, com o motivo escrito em `blocked_reason` e uma linha em
`promos_log`. **Nada foi apagado** — além da auditoria, manter a linha impede que o mesmo
`item_id` seja reinserido pela varredura seguinte, por causa do `ON CONFLICT`.

**O trade-off aceito:** muito menos volume. Uma loja só, com poucas ofertas por dia, contra
uma página inteira de categoria. O Eduardo já sinalizou a direção futura ("no futuro veremos
como misturar e incluir outras lojas do mesmo nicho"), e a tabela `lojas_confiaveis` já
existe para isso — mas ampliar é decisão dele, uma loja de cada vez.

---

## Decisão 20 — Deduplicar por produto, não só por anúncio

**A decisão, em 13/08/2026:** o `Pokemon Store Scanner` deduplica em dois níveis. O primeiro
continua sendo o `ON CONFLICT (item_id) DO NOTHING`, compartilhado com o Publisher. O segundo
roda dentro do scanner, antes do `INSERT`, e compara o **`product_id` de catálogo** e, quando
ele não existe, o **título normalizado somado ao preço atual**.

**O porquê:** logo na primeira varredura real a loja oficial anunciou o mesmo box Mega Zygarde
ex em duas fichas diferentes — `/p/MLB69755805` e `/up/MLBU3914159030` —, mesmo preço, dois
`item_id`. Pelo critério antigo eram dois produtos, e os dois entraram na fila. Publicar o
mesmo box duas vezes num canal de promoções queima exatamente a credibilidade que o projeto
inteiro tenta proteger, e numa loja com 3 produtos a repetição seria óbvia.

**Por que dentro do scanner e não na regra compartilhada:** mexer no `ON CONFLICT` afetaria o
Publisher e o scanner antigo. A camada nova fica isolada na fonte que a exige, sem tocar em
nada que já funciona.

**Qual dos dois fica:** o que tem `product_id` de catálogo, porque o link de catálogo é mais
estável que o de anúncio individual. O descartado vai para `promos_log` com o motivo por
extenso e o `item_id` do que ficou, para dar auditoria.

**O risco assumido:** título normalizado + preço é heurística, e duas cartas diferentes com as
mesmas palavras e o mesmo preço exato seriam tratadas como uma. É improvável, e o erro que ele
evita (publicar duas vezes) custa mais caro que o erro que ele pode causar (deixar de publicar
um item parecido). Toda decisão fica registrada, então dá para conferir.

---

## Decisão 21 — A COPAG entra no escopo, por ser o vendedor de dentro da loja oficial

**A decisão do Eduardo, no mesmo 13/08/2026, poucas horas depois da Decisão 19:** *"se quiser
deixar a loja copag também na lista de lojas, pode deixar, só lembra que tem que ser produtos
pokemon"*. A linha da COPAG em `lojas_confiaveis` passou a `ativa = TRUE`.

**O argumento que destravou:** a loja oficial da Pokémon no Mercado Livre é *multiseller*, e a
**COPAG é o vendedor real de vários itens dentro dela** — os cards trazem literalmente "COPAG
por Pokémon", com selo de loja oficial. Ou seja, quem compra na loja da COPAG compra do mesmo
vendedor que já estava sendo aceito pela porta da loja oficial. Incluir a COPAG não afrouxa o
critério de procedência da Decisão 19; só abre uma segunda porta para o mesmo estoque.

**A condição que continua valendo:** "tem que ser produtos pokemon". Quem garante isso é o
`filtro_titulo` da linha da loja, que na época era `pok[eé]mon|tcg|booster`. Na primeira
varredura com a COPAG ligada, ele barrou **32 dos 36 produtos** da vitrine — Truco, Harry
Potter, Bicycle, NFL, Turma da Mônica, pôquer, jogos de tabuleiro. Sem esse filtro, baralho de
Truco iria para um canal de Pokémon no primeiro ciclo. Esse filtro foi **substituído** no
mesmo dia por um mais exigente, que pede produto de TCG e não só produto Pokémon
([Decisão 25](#decisão-25--o-filtro-passa-a-exigir-produto-de-tcg-e-o-funko-fica-no-canal)).

**O ganho concreto:** a loja oficial sozinha rendia 1 item publicável. Com a COPAG, a fila
passou a 3. O volume do canal depende muito mais da COPAG do que da loja oficial.

**O que isso exigiu do código:** a deduplicação da Decisão 20 passou a valer **entre lojas**, e
não só dentro de cada uma. O mesmo box pode estar anunciado nas duas com `item_id` diferente, e
sem isso o canal publicaria o mesmo produto duas vezes com dois links.

---

## Decisão 22 — Pausar a publicação diante da suspeita sobre o link de afiliado

**A decisão, em 13/08/2026 por volta de 01h:** desativar o `Pokemon Publisher v2` **como
precaução**, mantendo o Scanner ativo. É pausa, não rollback: nenhuma configuração foi desfeita
e religar é um clique.

> **Desfecho, no fim do dia 13/08/2026: a suspeita se confirmou.** A pausa evitou posts sem
> comissão. O formato foi corrigido — veja a Decisão 23, logo abaixo.

**O motivo:** a comparação entre o link que o bot monta e um link real gerado no painel de
afiliados sugere que `matt_word` e `matt_tool` estão **trocados**, e que falta um parâmetro
`ref` assinado pelo servidor. Se a leitura estiver certa, cada post é tráfego entregue sem
comissão. A tabela comparativa e os passos de correção estão em
[troubleshooting, P16](troubleshooting.md#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos).

**Por que não corrigir o link agora:** a hipótese vem da leitura de um exemplo. Trocar os
parâmetros sem confirmação seria substituir um erro possível por outro erro possível — e, pior,
com a falsa sensação de que o problema foi resolvido. O node que monta o `utm_link` ficou
intocado de propósito.

**Por que pausar em vez de deixar rodar:** a janela de publicação abre às 8h BRT e o teto é de
30 posts por dia. Post publicado não volta atrás, e link sem comissão desperdiça exatamente o
tráfego que o projeto existe para monetizar. Coletar promoção, ao contrário, não custa nada —
por isso o Scanner segue ligado e a fila estará cheia quando o Publisher voltar.

---

## Decisão 23 — O formato do link de afiliado, confirmado e corrigido

**A decisão, em 13/08/2026:** adotar
`?matt_word=caed1312314&matt_tool=96097202&forceInApp=true` como o formato definitivo do link
de afiliado, e aplicá-lo nos **dois** scanners, mesmo no que está desativado.

**A confirmação:** a suspeita da Decisão 22 foi checada contra **dois** links reais gerados no
painel de afiliados do Eduardo — não um só, que era a fragilidade que impedia decidir antes. Os
dois mostraram o mesmo padrão: `matt_word` carrega o **apelido da conta** (`caed1312314`) e
`matt_tool` carrega o **ID numérico da etiqueta** (`96097202`). O bot fazia exatamente o
contrário.

**O que foi descartado no caminho:**

- **`matt_source=social`** — não aparece em nenhum link do painel. Saiu.
- **`ref=<token>`** — aparece em todo link do painel, mas é **assinado pelo servidor** do
  Mercado Livre e não pode ser produzido fora dele. Tentar imitar seria inventar um valor que o
  ML descarta. A atribuição funciona sem ele; quem identifica o afiliado é o par
  `matt_word` + `matt_tool`.
- **Continuar esperando por mais confirmação** — dois exemplos independentes com o mesmo padrão
  são evidência suficiente, e cada dia de pausa é um dia de canal parado.

**Por que corrigir também o `Pokemon Scanner v2`, que está desativado:** ele é o plano B se o
escopo de loja oficial for revisto. Deixar um scanner adormecido com o link errado é plantar
exatamente o mesmo bug para daqui a três meses, quando ninguém mais lembrar do assunto.

**A consequência que quase passou batido:** corrigir o código **não conserta a fila**. O
`utm_link` é gravado no banco pelo Scanner, e o Publisher publica o que está gravado. Os itens
coletados antes da correção continuam com o link velho até um `UPDATE` regravá-los. O SQL está
em [troubleshooting, P16](troubleshooting.md#p16--resolvido-o-link-de-afiliado-estava-com-os-parâmetros-invertidos).

**Como saber se deu certo de verdade:** não é olhar a URL do post — é o painel de afiliados
registrar o clique. Esse é o único teste que fecha a questão.

---

## Decisão 24 — Nunca publicar sem link de afiliado

**Data:** 13/08/2026 · **Quem decidiu:** Eduardo

**O que ele disse, literalmente:** *"ajusta tudo bem certo para publicar só com o link de
afiliado, pois a ideia é ganhar comissão pelas vendas"*.

**O que existia até então.** O node `Format PT-BR Message` tinha uma linha aparentemente
inofensiva:

```js
const buyLink = (d.utm_link && String(d.utm_link).trim()) ? d.utm_link : d.permalink;
```

Ou seja: sem `utm_link`, o post saía assim mesmo, com o **link cru** do Mercado Livre. Ele
funciona, o assinante compra, e o Eduardo não ganha nada. Era um fallback escrito com a
intenção certa — "não deixar de publicar" — resolvendo o problema errado.

**A decisão:** o fallback foi **removido**. O Publisher só publica se o `utm_link` contiver
`matt_word=caed1312314` **e** `matt_tool=96097202`. Item que não passa não é publicado.

**A lição, que vale para além deste caso:** **publicar sem comissão é pior do que não
publicar.** Um canal sem post hoje é um canal sem post hoje. Um canal que entrega tráfego
de graça para o Mercado Livre está trabalhando contra o próprio propósito, e — pior — em
silêncio, porque tudo parece estar funcionando. Quando um fallback "salva" a execução às
custas da razão de existir do sistema, o certo é falhar.

**Por que três camadas e não uma.** A mesma regra foi escrita em três lugares, de propósito:

1. `Fetch Next Pending` não seleciona item sem link de afiliado válido.
2. `Format PT-BR Message` + o novo `IF Pode Publicar?` barram o que escapar.
3. `Log Nao Publicavel` e `Registrar Pendentes Impublicaveis` gravam o motivo em
   `promos_erros` com `error_step = 'afiliado'`.

Camada 1 sozinha bastaria no dia a dia — mas ela é uma linha de `WHERE`, o tipo de coisa
que alguém apaga sem perceber ao mexer na consulta. Camada 2 é a que sobrevive a isso.

**O efeito colateral que resolveu outro problema.** Filtrar na consulta em vez de descartar
na formatação também matou metade do [P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha):
antes, um item sem link no topo da fila era escolhido de novo a cada 5 minutos e travava
todos os outros atrás dele. Agora ele nem é escolhido. A fila passa por cima e continua.

**O que se aceitou em troca:** item sem link de afiliado fica parado em `pending`
indefinidamente. É intencional. Ele volta sozinho para a fila assim que o `utm_link` for
regravado, e enquanto isso não sumiu do radar — está listado em `promos_erros`.

---

## Decisão 25 — O filtro passa a exigir produto de TCG, e o Funko fica no canal

**Data:** 13/08/2026, à tarde · **Quem decidiu:** Eduardo

**O gatilho.** O primeiro post depois do religamento foi um **Boneco Funko Pop! do Slowpoke**.
Produto oficial, promoção real, e completamente fora de um canal chamado Promo Pokémon
**TCG**. A ordem foi: *"apertar o filtro de título para aceitar só produto de TCG daqui pra
frente"*.

**O diagnóstico surpreendeu.** A suspeita registrada no README era de que o filtro
`pok[eé]mon|tcg|booster` fosse frouxo demais e tivesse casado com "Pokémon" no título do
Funko. Ao consultar a tabela, a realidade era outra: **a loja `pokemon` estava com
`filtro_titulo = NULL`** — sem filtro nenhum. O filtro frouxo era o da COPAG, e o Funko nem
veio de lá.

A premissa por trás do `NULL` era "tudo na loja oficial da Pokémon já é Pokémon". Verdade, e
irrelevante: a pergunta certa não é se o produto é Pokémon, é se é **carta**. A loja oficial
vende produto licenciado também. **Lição: uma premissa correta pode proteger a coisa errada.**

**A regra nova**, gravada nas duas lojas ativas — a mesma regex para as duas:

```
^(?!.*(?:funko|\bpop\b|pel[uú]cia|bonec[oa]s?|...))(?=.*pok[eé]mon)(?=.*(?:\bcartas?\b|booster|\bbox\b|\bdecks?\b|...))
```

Três exigências simultâneas: não conter vocabulário de produto licenciado, conter "Pokémon", e
conter vocabulário de TCG. O texto completo e a razão de cada parte estão na
[Regra 0b](regras-de-negocio.md#regra-0b--tcg-acessório-de-tcg-e-figura-pokémon-não-merch).

**Por que uma regex só, e não uma coluna de exclusão separada.** O node aplica o
`filtro_titulo` como teste de inclusão (`reFiltro.test(titulo)`), então uma lista de exclusão
exigiria coluna nova no banco, mudança no `Pokemon Schema Setup v2`, no `SELECT` do
`Buscar Lojas Ativas` e no código do `Extrair Ofertas das Lojas` — quatro pontos de alteração
em produção. O lookahead negativo resolve **sem tocar em uma linha de código**: é um `UPDATE`,
reversível em segundos. A regex fica feia, e essa é a troca aceita. Se um dia a lista de
exclusão crescer a ponto de virar ilegível, aí sim vale a coluna separada.

**A armadilha que quase passou batido.** O node testa `reFiltro.test(titulo) || reFiltro.test(norm(titulo))`
— original **ou** normalizado. Com lookahead negativo, isso inverte a lógica de segurança: para
o item ser barrado, ele precisa falhar nas **duas** formas. Um termo escrito só como `pelúcia`
não barraria nada, porque o item escaparia pela forma sem acento. Por isso todo termo
acentuado virou classe: `pel[uú]cia`, `cole[cç][aã]o`, `[aá]lbum`. O teste em JavaScript
compara as duas formas item a item justamente para pegar esse tipo de furo.

**Como foi validado antes de gravar:** 30 títulos (12 que devem passar, 18 que devem ser
barrados) — 100% corretos, sem divergência entre as duas formas. Depois, contra os **13
títulos que o bot realmente já coletou**: 12 continuam entrando e o **único barrado é o
Funko**. Por fim, a varredura real: loja oficial 3 de 3 aprovados, COPAG 4 de 39.

**O post do Funko fica no canal, por decisão explícita do Eduardo.** A mudança vale só para o
que for coletado daqui em diante. É coerente: o post é uma promoção real e verdadeira, e
apagar mensagem de canal só cria buraco na timeline de quem já viu. **Regra de escopo não é
retroativa.**

**Achado de brinde, e grave.** Ao rodar o Scanner para testar o filtro, os itens saíram com o
`utm_link` no **formato antigo**, mesmo com o código corrigido. O motivo: o n8n separa a
versão **salva** da versão **publicada**, e o Store Scanner rodava havia horas com a versão
publicada antiga. A correção do link (Decisão 23) estava salva, não ativa. Um
`publish_workflow` resolveu, e a varredura seguinte já gerou o link certo. **Lição: salvar não
é publicar.** Depois de corrigir um workflow, confira `activeVersionId` — ou, mais simples,
rode na mão e olhe o dado que saiu.

---

## Decisão 26 — Item sem foto também para de travar a fila

**Data:** 13/08/2026, no fechamento do dia.

**Contexto.** A trava de afiliado da Decisão 24 resolveu metade do
[P8](troubleshooting.md#p8--a-fila-travou-o-mesmo-item-tenta-publicar-toda-vez-e-falha). A outra
metade continuava aberta: o Publisher pega sempre o item de maior desconto, e um item **sem
foto** faz o `sendPhoto` do Telegram devolver erro 400. O item não vira `posted`, então na
execução seguinte a consulta escolhe o mesmo item de novo — e a fila inteira para atrás dele,
a cada 5 minutos, indefinidamente. Não era hipótese: já tinha acontecido.

**A decisão.** Aplicar ao caso da foto exatamente o mesmo desenho da trava de afiliado, em vez
de inventar um tratamento diferente:

1. O `Fetch Next Pending` só seleciona item cujo `thumbnail` comece com `http`.
2. O `Format PT-BR Message` revalida e marca `publicavel: false` com `etapa: 'foto'`.
3. O `Log Nao Publicavel` grava em `promos_erros` com `error_step = 'foto'`, e o
   `Registrar Pendentes Impublicaveis` denuncia os pendentes que a fila ignorou.

**O que mudou de nome, e por quê.** O IF passou de `Tem Link de Afiliado?` para
`Pode Publicar?`, e os dois nodes de log perderam o "Sem Afiliado" do nome. Um node chamado
"Tem Link de Afiliado?" que também barra foto é uma armadilha para quem for ler o workflow
daqui a três meses. O campo `etapa` diz qual trava reprovou o item, e é ele que vira o
`error_step`.

**Por que filtrar na consulta em vez de tratar o erro.** Tratar o erro depois de acontecer
ainda deixa o item na frente da fila. Filtrar na origem faz a fila passar por cima e continuar
andando; o item fica em `pending` esperando o dado ser corrigido, visível em `promos_erros`.
A regra geral que emerge daqui: **item impublicável não deve ser escolhido, e não sumir
calado.**

**Custo aceito.** Um item com foto quebrada nunca será publicado sozinho, mesmo que seja a
melhor oferta do dia. É o mesmo trade-off da Decisão 24, e a mesma resposta: um post que
falha não vale mais do que um post que não sai.

---

## Decisão 27 — O formato de perfil social não substitui o link direto

**Data:** 13/08/2026, à noite · **Quem decidiu:** Eduardo

**O gatilho.** O Eduardo encontrou um canal concorrente cujos links de compra têm outro
formato — `https://www.mercadolivre.com.br/social/<apelido>?matt_word=…&matt_tool=…&forceInApp=true&ref=<token>`
— e notou que, ao clicar, *"abre em cima o nome do canal e o produto e várias outras
opções"*. A pergunta era se valia adotar isso para o canal ganhar marca.

**A decisão, nas palavras dele:** *"se o nosso tiver pagando e mandando direto pro produto,
acho até melhor"*. **O formato de produção continua exatamente como está**
([Decisão 23](#decisão-23--o-formato-do-link-de-afiliado-confirmado-e-corrigido)), sem
nenhuma alteração de código ou de workflow.

**O que é esse formato.** `/social/<apelido>` é o **Perfil Social do afiliado**, recurso
oficial do programa, documentado pelo próprio Mercado Livre em `/l/afiliados-perfil-social`.
Não é página de produto: é uma landing page de vitrine, com foto, nome de perfil, descrição,
contador de seguidores e botão **Seguir**. É a mesma coisa que o painel chama de
*"Pré-visualizar no meu perfil"* no passo 6 de `/l/afiliados-primeiros-passos` — ou seja, o
gerador de links produz esse formato como variante "o produto dentro do meu perfil".

Na página do concorrente aparecem, de cima para baixo: o nome do perfil, a bio,
"+150 seguidores", o botão Seguir, **um** produto em destaque, as abas *Para você /
Mais vendidos / Ofertas* e uma grade de cerca de 20 produtos sob o título "Quem viu este
produto também comprou". As "várias outras opções" que o Eduardo viu são essas abas e essa
grade.

**O teste que fecha a questão: com e sem `ref`.** A mesma URL foi aberta duas vezes, com os
mesmos `matt_word` e `matt_tool`, mudando só a presença do `ref`:

| | Com `ref` | Sem `ref` |
| --- | --- | --- |
| Cabeçalho (nome, bio, seguidores) | igual | igual |
| Produto em destaque | **aparece** | **não aparece** |
| Corpo da página | "Quem viu este produto também comprou" | "Minhas listas" / "Minhas recomendações" — as listas curadas do afiliado |

**É o `ref` que carrega o produto de destino.** Sem ele a URL não quebra: ela degrada para a
vitrine genérica do afiliado. Indicar o produto por parâmetro simples também não funciona —
`?item_id=MLB…` é **ignorado** pelo Mercado Livre.

**Por que isso é bloqueio, e não detalhe.** A Decisão 23 registrou que o `ref` é um token
assinado pelo servidor, impossível de produzir fora do painel, e concluiu — corretamente —
que a atribuição funciona sem ele. **No formato social essa conclusão se inverte:** ali o
`ref` deixa de ser opcional, porque é o único lugar onde o produto existe. Um bot que coleta
oferta nova a cada 10 minutos precisaria de um token novo, gerado à mão no painel, para cada
produto. Não há caminho automatizado legítimo.

**O perfil do Eduardo já existe, e está vazio.** `mercadolivre.com.br/social/caed1312314`
responde com **"TCG Booster Promo"**, descrição *"Ofertas reais de cartas Pokémon, curadoria
anti-golpe e atualização diária."*, **0 seguidores** e a mensagem **"Este perfil ainda está
vazio"**. Nome e descrição estão prontos; falta conteúdo. Hoje, apontar o botão dos posts
para lá mandaria todo assinante para uma página sem produto nenhum.

**Não existe API pública para gerar esses links** — o que confirma a
[Decisão 1](#decisão-1--a-api-oficial-do-mercado-livre-está-descartada) por outro caminho.
O portal de desenvolvedores não tem seção de afiliados (`/pt_br/afiliados` responde **404**),
e os canais oficiais só descrevem o Gerador de Links — que, segundo o próprio ML, *"funciona
apenas no Portal do Afiliado do computador"* — e a Barra de Afiliados. As ferramentas
comerciais de automação resolvem por **engenharia reversa**: capturam o cookie de sessão do
navegador e repetem a chamada interna `createLink`. Isso expira, exige um humano renovando
credencial e opera fora dos termos do programa.

Uma dessas ferramentas entrega o argumento mais forte de graça: ela mantém "etiquetas
reserva" porque *"a API do Mercado Livre às vezes gera um link que não cai no produto (cai no
seu perfil de afiliado)"*, e nesse caso **regenera o link**. Quem vive disso trata "cair no
perfil social" como **defeito a corrigir**, não como recurso a buscar.

**O argumento de conversão, que valeria mesmo se o bloqueio técnico caísse.** A comissão é
atribuída **igual** nos dois formatos: quem identifica o afiliado é o par `matt_word` +
`matt_tool`, presente em ambos. A diferença está no caminho até a compra:

- **Hoje:** clique no botão do post → página do produto.
- **Social:** clique no botão → landing do perfil → achar e clicar no card → página do produto.

É um clique a mais num funil curto, no Telegram e no celular, onde o leitor está rolando
rápido. E há um custo pior que o clique: a **dispersão**. A landing exibe cerca de 20 produtos
concorrendo com o que foi anunciado, incluindo itens de outras marcas e alguns *"Anúncio
pausado"*. Para um canal cujo diferencial é curadoria — "eu filtrei, este aqui vale a pena" —,
jogar o leitor numa grade genérica desmonta a própria proposta. Existe um contrapeso real: se
ele comprar outro item da vitrine, a comissão ainda é do Eduardo. Mas isso só vale se ele
comprar, e a matemática favorece o caminho mais curto até o item que já convenceu.

**E o ganho de marca é menor do que parece.** O nome que aparece no topo é o do perfil no
Mercado Livre, visto **depois** do clique, quando o leitor já estava no canal e já sabia de
onde veio. Marca na entrada — que é onde ela importa — se constrói no nome, na foto e no
formato do post, não numa página intermediária do ML.

**O caminho intermediário, recomendado e ainda não feito.** Dá para ter o ganho de marca sem
pagar o clique extra: usar o perfil social como **vitrine fixa, não como link de compra**.
Ou seja, preencher o perfil `TCG Booster Promo` com uma ou duas listas de recomendações no
painel e divulgar `mercadolivre.com.br/social/caed1312314` na descrição do canal ou numa
mensagem fixada — o equivalente ao "link da bio". **O botão de compra de cada post continua
com o link direto.** É trabalho manual no painel, não automação, e está registrado no
[roadmap](roadmap.md#perfil-social-do-afiliado-como-link-da-bio).

**O que mudaria esta decisão:** o Mercado Livre publicar uma API oficial de geração de links
de afiliado, ou passar a aceitar o produto de destino por parâmetro simples na URL social.
Antes de reabrir o assunto, refaça o teste de um minuto: abra a URL social de qualquer
afiliado com e sem o `ref` e veja se o produto em destaque sobrevive.

---

## Decisão 28 — Alerta privado de saúde no mesmo chat do LinkedIn

**Data:** 13/08/2026, à noite · **Quem decidiu:** Eduardo

**O que ele disse, literalmente:** o alerta de LinkedIn que ele já usa hoje vai servir
também para o canal TCG / promo.

**A decisão:** criar o workflow `Pokemon Health Alert` (`3irgeWFKZGZZrJ5u`), sem mexer no
alerta LinkedIn, reutilizando o **mesmo destino privado**. O destino real não é o bot do
canal (`Pokemon Telegram Bot` / `@promopokemontcg`). É o HTTP do
`LinkedIn Post Diario Texto` (`ysHFWIV0tGWJbhjo`), nodes `Notify Telegram` e
`Notify Telegram Skip`, para o chat privado do Eduardo via `@eduardo_alerta_bot`
("Alertas Linkedin/TCG Promo"). Esse workflow LinkedIn **não usa credencial Telegram do
n8n** — o token do bot de alerta está no próprio node HTTP, e o `chatId` vem do Code
`Build Notify Message`.

**Por que HTTP e não o node Telegram.** A única credencial Telegram desta instância é a
do canal público. Usá-la aqui publicaria o alerta operacional em `@promopokemontcg`. O
caminho seguro é copiar o destino do LinkedIn, não o bot do canal.

**O que o alerta cobre, e o que não cobre.** Cobre quebra/parada: `promos_erros` nas
últimas 24h, Scanner parado (~90 min) ou com `ultimo_erro`, Publisher parado na janela
com fila publicável (~2h), parser/vitrine vazia. **Não cobre fila vazia** — isso é o
dia normal quando não há oferta nova, e o texto do recado deixa isso explícito. Também
não cobre n8n inteiro fora do ar (ele próprio não rodaria).

**Como foi validado:** execução manual com sucesso; a mensagem chegou no chat privado
(não no canal). Havia uma linha real em `promos_erros` das 05h11 BRT (vitrine `pokemon`
vazia), então o recado foi alerta de verdade, não um "tudo ok" inventado. Publicado
depois do teste: `versionId` = `activeVersionId`.

**O que mudaria esta decisão:** o Eduardo pedir outro chat, ou guardar o bot de alerta
numa credencial n8n em vez do token no node HTTP (melhor higiene, mesmo destino).

---

## Decisão 29 — Volume do canal: 5% de desconto, teto 40 e alerta acima de 40%

**Data:** 13/08/2026, ~20h BRT · **Quem decidiu:** Eduardo

**O que ele pediu, em quatro pontos:** (1) aumentar um pouco as lojas oficiais para ter
mais ofertas; (2) teto diário de 30 para **40**; (3) desconto mínimo para **5%**, porque o
volume estava baixo e 5% já puxa alguém interessado; (4) se o desconto for **acima de 40%**,
usar outro layout / mensagem mais impactante.

**Lojas novas na busca automática: nenhuma aprovada.** Foram testadas ~80 vitrines oficiais do Mercado Livre
com o parser do projeto (`extrairPayloadLoja`). As únicas duas que tinham volume de TCG
ainda fora da tabela — `asgard` (10 TCG, 7 ofertas ≥5%) e `barao-geek-house` (5 TCG, 5
ofertas ≥5%) — vendem **lote de carta avulsa** ("Kit 100 Cartas", "Lote De 50 Cartas",
"3 Cartas V Japonesa"), não produto lacrado. Cadastrá-las encheria o canal de ruído e
furaria a Regra 0b. O restante (redes, games, brinquedo) ou não tem vitrine, ou a vitrine
não rende TCG Pokémon lacrado. Melhor 0 ruído do que 2 lojas ruins. Continuam ativas as
cinco já cadastradas: `pokemon`, `copag`, `brinkjr`, `attack-toys`, `cade-meu-jogo`.
A **Psz3D** (`psz3d`) foi cadastrada depois, ainda em 13/08 à noite, a pedido do Eduardo:
vitrine revalidada com 6 produtos de TCG lacrado (box, ETB, blister), loja oficial ML
(`official_store_id` 99954), mesmo filtro e mínimo 5%. Sem oferta ≥ 5% no dia do cadastro.
Na segunda busca da mesma noite (meta de 15 lojas) entraram mais três oficiais com TCG
lacrado na vitrine: `ilusoes-industriais` (8 lacrados, 2 ofertas ≥5%), `parolar`
(1 combo booster a 5%) e `escala-miniaturas` (3 lacrados com filtro apertado, porque a
vitrine mistura carta avulsa). O teto de 15 **não foi atingido**: loja oficial com TCG
lacrado na homepage é rara; a maior parte do volume está em `/pagina/` de vendedor.

**Desconto mínimo 5% — experimento explícito, como o de 10%.** `UPDATE lojas_confiaveis
SET desconto_minimo = 5 WHERE ativa = TRUE;` em 13/08/2026 à noite. Motivo: volume para
testar o canal e a atribuição de comissão. **Não mexe no teto anti-golpe do Scanner v2
(60%)** — o Store Scanner usa o mínimo da loja. SQL de volta no
[runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar):
`UPDATE lojas_confiaveis SET desconto_minimo = 15 WHERE ativa = TRUE;`

**Teto diário 40.** Publisher → `Under Daily Limit?` → `rightValue` 30 → **40**. Publicado
(`versionId` = `activeVersionId` = `b331fb61`). O ritmo continua 1 post a cada 5 minutos:
40 posts ainda cabem na janela 8h–22h sem despejar tudo de uma vez.

**Layout acima de 40%.** No `Format PT-BR Message`, `discount_pct > 40` troca o cabeçalho
`🔥 OFERTA POKÉMON TCG` por `🚨 SUPER OFERTA` + `⚠️ ALERTA DE PREÇO` e deixa economia e
% OFF em negrito. Travas iguais: escape HTML, limite 1024, sem hashtags, idioma só com
confiança ≥ 0,85, botão com o mesmo `buy_link` de afiliado, sem publicar se falhar
afiliado+foto. Testado em JavaScript com dois títulos fictícios (12% e 45%) antes de
subir.

**O que mudaria esta decisão:** o painel de afiliados confirmar cliques o bastante para
voltar o mínimo a 15%; ou aparecer uma loja oficial ML com TCG **lacrado** de verdade na
vitrine.

**Superada em parte pela [Decisão 35](#decisão-35--pacote-a-qualidade-antes-de-volume)
(~22h35):** o experimento de 5% em todas as lojas acabou. Teto 40, layout > 40% e as nove
lojas continuam. Mínimo vigente: 10% em `pokemon`/`copag`, 15% nas outras.

---

## Decisão 30 — Layout do post mais limpo: sem coringa, sem gritaria

**Data:** 13/08/2026, ~20h BRT · **Quem decidiu:** Eduardo

**O que ele pediu:** um post mais bonito e profissional; tirar “a carta do coringa” da
descrição; e, se houver cupom, mostrar. Cupom fictício **não** entra.

**O que mudou no `Format PT-BR Message` (publicado, `versionId` = `activeVersionId` =
`199b2d7e`):**

- Saiu o 🃏 na frente do título. Era o emoji de *joker* do baralho, não uma carta Pokémon.
- Saiu o 🔥 de todo post. Cabeçalho padrão agora é só **Pokémon TCG**.
- Super oferta (> 40%) ficou **um bloco só** (`SUPER OFERTA · 45% OFF`), sem o segundo
  grito `ALERTA DE PREÇO` e sem o 🤑.
- Cupom, quando existir na tabela, sai com código copiável + descrição · mínimo · validade.
  Em 13/08 o Eduardo autorizou a primeira campanha real (`BRINQUEDOS`, até 16/08). Sem
  cupom ativo, a linha some.

Travas iguais: escape HTML, 1024 caracteres, afiliado + foto obrigatórios, botão inalterado.
Testado em JavaScript com 12%, 45%, cupom e item sem afiliado antes de publicar.

**O que mudaria esta decisão:** o Eduardo achar o layout novo frio demais e pedir um
marcador visual de volta (🎴 ou 📦, nunca 🃏).

---

## Decisão 31 — Idioma volta a aparecer no post, mesmo sem a palavra no título

**Data:** 13/08/2026, ~21h BRT · **Quem pediu:** Eduardo (“colocar o idioma no anúncio;
vi que não está mais aparecendo”)

**O que estava acontecendo.** O Publisher **já imprimia** `Idioma: Português` quando a
confiança era ≥ 0,85. Os posts recentes (Escala Miniaturas, Pitch Black EN) saíram sem a
linha porque o Scanner gravou `idioma = desconhecido`: o título não tinha “Português” nem
“Inglês”. O Mercado Livre abrevia inglês como **Ing** no fim (`… Elite Trainer Box Ing`),
e essa abreviação não estava nas regras. “Box Treinador Avançado” e “Deck de Batalha”
também não tinham palavra de idioma.

**O que mudou (publicado no Publisher, `versionId` = `activeVersionId` = `4c5da3e9`):**

- Palavra **Ing** (inteira) conta como inglês.
- Sem palavra de idioma, sinais de produto: `treinador avancado` / `deck de batalha` /
  `mega evolucao` → português; `elite trainer box` / `pitch black` → inglês.
- Loja oficial `copag` ou `pokemon` sem outro sinal → português (0,85).
- Se o banco vier `desconhecido`, o Publisher **detecta de novo no momento do post**.
  Os próximos anúncios já saem com a linha; posts já enviados no Telegram não são editados.

A regra da Decisão 18 permanece: ambíguo ou sem pista nenhuma **não inventa** idioma.

**O que mudaria esta decisão:** o Eduardo quiser idioma em 100% dos posts, mesmo sem pista
— aí o default seria português, com o risco de marcar um ETB inglês como PT.

---

## Decisão 32 — Cupom BRINQUEDOS é campanha pública do ML até 16/08

**Data:** 13/08/2026, ~21h BRT · **Quem autorizou:** Eduardo

**A citação:** o cupom Brinquedos está disponível pelo Mercado Livre; em produtos
selecionados, vale até domingo (16/08/2026).

**O que foi cadastrado:** uma linha em `cupons`, à mão, como a Decisão 7 manda. Código
`BRINQUEDOS`, 15% OFF em brinquedos (produtos selecionados, teto R$ 50), mínimo R$ 59,
prioridade 100, válido até `2026-08-16 23:59:00-03`. **`categoria_id` ficou NULL de
propósito:** os itens do Store Scanner entram em `promos` com `category_id` NULL; se o
cupom levasse `MLB6899`, o `LEFT JOIN LATERAL` do `Fetch Next Pending` não casaria e o
post sairia sem a linha. O Publisher **não foi alterado** — ele já formatava cupom.

**O que isso não faz:** não republica posts antigos, não dispara o Scanner, não garante
que o código aplique em todo TCG (é produtos selecionados) nem que o inscrito sem o cupom
na carteira veja o desconto.

**Como desligar se reclamar:** `UPDATE cupons SET ativo = FALSE WHERE codigo = 'BRINQUEDOS';`

**Feito em 13/08 ~23h13** ([Decisão 36](#decisão-36--desligar-brinquedos-não-dá-para-saber-qual-item-aceita)):
`ativo = FALSE`. A linha permanece na tabela para auditoria.

---

## Decisão 33 — Repostar se o preço da vitrine cair depois do post

**Data:** 13/08/2026, noite (~22h BRT) · **Quem pediu:** Eduardo, de forma explícita

**A citação:** se o Scanner achar um item **já postado** mas com **preço menor** do que o
que foi ao Telegram, precisa postar de novo — “é uma oferta que entrou no meio do caminho”.

**O que impedia:** o `INSERT` do Store Scanner usava `ON CONFLICT (item_id) DO NOTHING`.
O `Extrair Ofertas das Lojas` já deixava o mesmo `item_id` passar como `aceito`; o banco
engolia a segunda tentativa. Preço de checkout logado (ex.: R$ 41,90) **não entra** — só o
polycard da vitrine.

**A decisão:** no `Inserir Promo da Loja`, o conflito passou a ter um ramo `DO UPDATE`
quando todas as travas abaixo passam. Publicado no Store Scanner (`versionId` =
`activeVersionId` = `2f6fa3c8`). O Publisher **não mudou**: ele já pega qualquer
`pending` com afiliado e foto.

Travas anti-flood (default, 13/08 noite):

| Trava | Valor | Por quê |
| --- | --- | --- |
| Queda mínima | ≥ **5%** **ou** ≥ **R$ 5** vs o `price_cents` já postado | Oscilação de R$ 1 não vira segundo post |
| Teto de repost | **1** por `item_id` a cada 24h (`promos_log.decision = 'repost'`) | Mesmo produto não bombardeia o canal |
| Ainda é oferta | Desconto mínimo da loja, no parser, como qualquer item novo | Queda sem “de/por” visível na vitrine não entra |
| Publicável | Link de afiliado (`matt_word` + `matt_tool`) **e** thumbnail `http` | Senão o Publisher pularia o item de novo |

O `UPDATE` regrava preço, desconto, permalink, `utm_link` e thumb, põe `status = 'pending'`
e zera `posted_at` / `telegram_message_id` / `blocked_reason`. O log grava `repost` com o
motivo `R$ antigo -> R$ novo`. Vale para o **mesmo `item_id`** (o anúncio que já foi ao
Telegram). Duplicata de catálogo com `item_id` diferente continua descartada no parser,
como antes.

**Números de conferência (fictícios, JS e SQL iguais):** R$ 64,31 → R$ 59,70 **sim**
(7,17% ≥ 5%, mesmo com menos de R$ 5); R$ 64,31 → R$ 63,00 **não** (2,04% e R$ 1,31).

**Riscos aceitos:** o post antigo continua no canal (não é editado); o teto diário de 40
deixa de contar o post original enquanto o item volta a `pending` (no máximo +1 no dia por
item); preço que oscila em volta do corte 5% / R$ 5 pode “piscar” — daí o teto de 1/dia.

**O que mudaria esta decisão:** o Eduardo achar o canal repetitivo e pedir só queda ≥ 10%,
ou pedir para editar o post antigo no Telegram em vez de mandar um segundo.

---

## Decisão 34 — Ritmo em produção: Scanner 5 min, Publisher 2 min

**Data:** 13/08/2026, noite (~22h) · **Fonte:** n8n ao vivo (não foi um pedido escrito à
parte; o workflow publicado já estava assim na conferência das 22h15)

**O que está valendo:**

| Workflow | Node do relógio | Intervalo | `versionId` = `activeVersionId` |
| --- | --- | --- | --- |
| `Pokemon Store Scanner` | `A Cada 5 Minutos` | **5 min** + jitter 0–60s | `2f6fa3c8` |
| `Pokemon Publisher v2` | `Every 2 Minutes` | **2 min** | `286b533e` na hora desta decisão; **`a621b8c9`** depois da [Decisão 35](#decisão-35--pacote-a-qualidade-antes-de-volume) |

A descrição do Store Scanner no n8n é explícita: *"Varre vitrines das lojas TCG a cada 5 min
(com jitter 0-60s). Nao usar 2 min: 9 lojas HTTP, risco de anti-bot."*

**Por que 5 e não 2 no Scanner.** Cada ciclo faz um GET por loja ativa. Com nove lojas, 2
minutos seriam ~6.480 HTTP/dia contra o Mercado Livre, sem contar o jitter. 5 minutos já
são ~2.600. O jitter continua obrigatório.

**Por que 2 no Publisher.** Com teto 40 e janela 8h–22h, o gargalo continua sendo o teto, não
o relógio. 2 minutos só adiantam o post quando a fila tem item; depois das 22h o fluxo
termina em milissegundos em `Outside Posting Window`. Se a fila encher, 40 posts cabem em
~80 minutos.

**O que a documentação antiga dizia** (10 min / 5 min) estava certo até o fim da tarde de
13/08. Quem restaurar `backups/2026-08-13/` sem olhar o n8n volta para esses intervalos.

**O que mudaria esta decisão:** anti-bot na vitrine → subir o Scanner para 15 ou 45 min;
canal “despejando” de manhã → o teto por hora da Decisão 35 já cobre isso.

---

## Decisão 35 — Pacote A: qualidade antes de volume

**Data:** 13/08/2026, ~22h35 BRT · **Quem pediu:** Eduardo, para o canal entregar oferta
boa, não “qualquer 5%”. Clique de afiliado **já estava provado** (5 cliques hoje, conta
só dele).

**O que mudou, de uma vez:**

| Peça | Antes | Agora |
| --- | --- | --- |
| Mínimo `pokemon` / `copag` | 5% | **10%** |
| Mínimo das outras 7 lojas | 5% | **15%** |
| Ordem da fila | só `discount_pct DESC` | `pokemon` → `copag` → economia em R$ → % |
| Teto por hora | nenhum | **4** posts na última hora corrida (`posted_at > now() - interval '1 hour'`) |
| Publisher publicado | `286b533e` | `a621b8c9` (`versionId` = `activeVersionId`) |

Pending abaixo do novo mínimo: **zero** na hora da troca (nada para marcar `descartado`).
O Scanner passa a recusar sozinho na próxima varredura.

**Como validar:** no n8n, Publisher `versionId` = `activeVersionId` = `a621b8c9`; a
execução agendada depois das 22h BRT deve parar em `Outside Posting Window` (janela
fechada). Amanhã, depois das 8h: no máximo 4 posts na primeira hora, Pokémon/COPAG
saem antes das satélites, e oferta < 10% nessas duas (ou < 15% nas outras) não entra.

Cupom continua **manual**. `BRINQUEDOS` foi **desligado** na Decisão 36. Raspar agregador continua fora.

**O que o Eduardo faz à mão no canal (não é código):** apagar posts de teste 7/11/12,
descrição e mensagem fixada. Catalog Scanner continua no roadmap (pacote B).

**O que mudaria esta decisão:** volume baixo demais por vários dias → baixar Pokémon/COPAG
de volta a 5% **só nessas duas**, sem afrouxar as satélites.

---

## Decisão 36 — Desligar BRINQUEDOS: não dá para saber qual item aceita

**Data:** 13/08/2026, ~23h13 BRT · **Quem pediu:** Eduardo, depois do teste `message_id` 29

**O que aconteceu.** O Publisher cola qualquer cupom `ativo` com `categoria_id` NULL em
**todo** post. O blister da Cadê Meu Jogo saiu com `BRINQUEDOS` e **não aceita** o código
(produtos selecionados de brinquedos, não carta TCG).

**O que foi tentado para destinar só aos selecionados:** a lista oficial é
`lista.mercadolivre.com.br/_Container_toys-e-babys` (campanha `13456503`). Da VPS e do PC
o ML responde 302 + `x-is-search-bot: true` e manda para verificação de conta. API de
campanha 404; busca oficial 403. Os polycards das 9 lojas **não** trazem esse ID. O
checkout logado é quem decide — e isso o bot não lê.

**A decisão:** `UPDATE cupons SET ativo = FALSE WHERE codigo = 'BRINQUEDOS';` (RETURNING
confirmou `ativo = false`). O JOIN do Publisher já ignora `ativo = FALSE`; **não** precisou
mexer no workflow. Posts novos saem sem a linha. Posts antigos no Telegram **não** são
editados — apagar o teste 29 (e 7/11/12) continua na mão.

Religar: `UPDATE cupons SET ativo = TRUE WHERE codigo = 'BRINQUEDOS';` — só se existir
código conferido à mão num item de **carta**.

**O que mudaria esta decisão:** o ML publicar feed estável de `item_id` elegíveis, sem
login, que dê para cruzar com a fila.

---

## Decisão 37 — Cartas Pokémon (plural) e acessórios de TCG, com Pokémon no título

**Data:** 14/08/2026, ~18h36 BRT · **Quem pediu:** Eduardo, para o teste de fim de semana
e para o grupo na semana seguinte.

**A decisão.** O canal passa a aceitar, além do lacrado (box, deck, blister, ETB):

1. Produto de **cartas Pokémon** no título (plural `cartas`, `baralho`, `tcg`).
2. **Acessório de TCG** com Pokémon no título: sleeve, playmat, binder/fichário,
   porta-cartas, deck box, toploader, capas para cartas, tapete de jogo.

Continua **fora:** Funko e merch, lote/avulso/kit, carta avulsa numerada, acessório
**sem** a palavra Pokémon (Dragon Shield cru, playmat Lorcana).

**Por que dois filtros.** Nas 8 lojas o positivo tem `\bcartas\b`. Na Escala Miniaturas
**não**: a vitrine mistura single ("Carta Pokémon Nymble 9/94"). Testado contra a
varredura das 18:20 — 15 singles da Escala passariam com `cartas?` e foram deixados
de fora. Sleeve/playmat Pokémon passariam na Escala.

**Onde mora:** `lojas_confiaveis.filtro_titulo`. Não mexeu em workflow. Pacote A
(10%/15%) segue igual.

**O que mudaria esta decisão:** o Eduardo pedir sleeve genérico (Dragon Shield sem
Pokémon) ou carta avulsa na Escala.

---

## Decisão 38 — Teto horário de 6 posts

**Data:** 14/08/2026, ~18h43 BRT · **Quem pediu:** Eduardo, no teste de fim de semana.

**A decisão.** O IF `Under Hourly Limit?` do Publisher passou de `hour_count < 4` para
`< 6`. Teto diário continua 40. Publicado `57c2826e` (`versionId` = `activeVersionId`).

**O porquê.** Quatro por hora atrasava o esvaziamento da fila no teste; seis ainda
espalha o canal (Publisher a cada 2 min) sem despejar 40 posts na primeira hora.

**O que mudaria esta decisão:** voltar a 4 se o canal ficar barulhento com gente no grupo.

---

## Decisão 39 — Cupom só no produto testado, e link com `wid`

**Data:** 14/08/2026, ~18h55 BRT · **Quem pediu:** Eduardo

**O que aconteceu.** O post `message_id` 35 (Makuhita 19 Cards) mostrou **R$ 30,89** da
vitrine da loja Pokémon (`MLB6637088258`) e o botão mandou para o catálogo `/p/MLB67071615`
**sem `wid`**. O checkout fechou em ~R$ 39 — outro anúncio da mesma ficha.

No mesmo dia o Eduardo pediu o `BRINQUEDOS` até domingo, só nos produtos que ele testou.

**A decisão.**

1. Cupom **não cola** sem linha em `cupons_itens`. Cadastro: neste chat, depois do teste
   no ML. `BRINQUEDOS` ativo até **16/08/2026 23h59 BRT**, 10 produtos, mínimo R$ 59.
2. O botão de compra leva `wid={item_id}` além do afiliado. Scanner (`Injetar Wid e Loja`)
   e Publisher (`Garantir Wid`).
3. Antes do Telegram o Publisher GET a URL com `wid`. Se o preço subir mais de R$ 1, o
   item vira `blocked` e **não posta**. Se a página falhar, segue o preço da fila (não
   mata o canal). Não calcula “preço com cupom”.
4. Publisher publicado `9f003450`. Scanner publicado `983e2ec5`.

**O que mudaria esta decisão:** o ML expor o anúncio da vitrine no `/p/` sem `wid`, ou
uma API de cupom por `item_id`.

---

## Decisão 40 — Reofertar após 3 dias, e contar o teto em BRT

**Data:** 16/08/2026, ~21h35 BRT · **Quem pediu:** Eduardo, para o projeto não parar
quando a vitrine só tem o que já foi ao canal.

**O que aconteceu.** No domingo o bot estava saudável (9 lojas, zero erro, Health Alert
ok). Último post: 16/08 08:00, `message_id` 42 (Box Caos Ascendente). Às 21h a fila
estava `pending = 0`. A varredura aceitou de novo 8 ofertas boas (15–33% OFF) que já
estavam `posted` — o `ON CONFLICT` não reenfileirava. Não é pane; é a regra de um post
por `item_id`.

**A decisão.**

1. Item `posted` que **continua** passando no filtro + mínimo, com afiliado e foto, volta
   a `pending` se `posted_at` tem **mais de 3 dias**. Pacote A e tetos 40/dia + 6/hora
   seguem. Não é o lote de sexta no mesmo fim de semana.
2. O teto diário passa a contar o dia em **Brasília**, não em UTC (depois das 21h BRT o
   `CURRENT_DATE` do banco já era o dia seguinte e zerava a conta).

Scanner publicado `0ff36da8`. Publisher publicado `7261bee7`.

**O que mudaria esta decisão:** o Eduardo pedir para nunca repetir o mesmo `item_id`,
ou encurtar/alongar os 3 dias.

---

## Decisão 41 — Figuras Pokémon no filtro, e nenhuma loja oficial nova

**Data:** 16/08/2026, ~21h45 BRT · **Quem decidiu:** Eduardo

**O que ele pediu:** mais lojas oficiais do Mercado Livre com carta Pokémon original, e
abrir a gama para **boneco/figura** (ainda sem pelúcia, caneca, camiseta, lote). Funko
continua fora — foi o Slowpoke de 13/08 que criou a Regra 0b.

**Filtro (dado, não workflow).** `UPDATE` em `lojas_confiaveis.filtro_titulo` nas 9 lojas.
Mudança em relação à [Decisão 37](#decisão-37--cartas-pokémon-no-plural-e-acessórios-de-tcg-com-pokémon-no-título):

- Saiu da exclusão: `bonec[oa]s?`, `action figure`, `\bfigures?\b`.
- Entrou no positivo: esses três + `\bfiguras?\b`, `est[aá]tua`, `articulad`, `miniatura`,
  `nendoroid`, `figuarts`, `banpresto`.
- Continua exigindo a palavra Pokémon. Continua barrando Funko, `\bpop\b`, pelúcia, merch,
  kit, lote, avulso.
- `sem repetir` virou `sem repetid` — a varredura da noite pegou
  *100 Cartas Pokemon Sem Repetida* como `sem_oferta` (passava no filtro velho).
- Escala Miniaturas: a mesma lógica, **sem** `\bcartas\b`.

Regex testada em Node (original **ou** normalizado) antes de gravar. Scanner manual
`20231`: boxes TCG continuam passando; Funko Slowpoke e Glaceon em `ilusoes-industriais`
ficaram `fora_do_filtro`; boneco sem Pokémon (Stitch, Barbie, Ana Castela) também. Nas 9
homepages **não havia** figura Pokémon não-Funko nesta rodada — o volume extra de boneco
só aparece quando a vitrine trouxer um.

**Lojas novas: zero.** Reabertos ~40 slugs (Sunny, Hasbro, Mattel, Lego, Grow, Panini,
redes, Bandai/Takara, Funko, Pokémon Center, Liga Pokémon, hobbies). Ri Happy / PBKids /
Bandai / Kabum / Toymania **não têm** `/loja/{slug}`. Nintendo existe, mas a homepage é
jogo (Legends Z-A) — não cadastrar. Funko existe e tem Pokémon na vitrine — **não**
cadastrar. A busca de 13/08 ([Decisão 29](#decisão-29--volume-do-canal-5-de-desconto-teto-40-e-alerta-acima-de-40))
já tinha mostrado que loja oficial com TCG lacrado na homepage é rara; o filtro novo não
mudou isso. `asgard` e `barao-geek-house` continuam de fora (lote).

Mínimo 10%/15% e teto 40 + 6/hora **não** mudaram. Scanner v2 continua inativo. Os 7/8 do
teste de 14/08 **não** foram reenfileirados. Console SQL voltou para SELECT.

**O que mudaria esta decisão:** aparecer homepage oficial com TCG lacrado ou figura
Pokémon (não Funko) — aí o cadastro segue o [runbook §13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar),
máximo 4 lojas por rodada, 15%, filtro copiado de `pokemon`. Se boneco barato encher a
fila, `preco_minimo` (ex. R$ 39) sem mexer no %. Catálogo profundo via ScraperAPI continua
fora — é o próximo volume, não este `UPDATE`.

---

## Decisão 42 — Catalog Scanner criado e deixado inativo

**Data:** 16/08/2026, ~23h10 BRT · **Quem decidiu:** Eduardo (opção D)

**A decisão:** o `Pokemon Catalog Scanner` (`2ckVyvFPvtqwECDI`) **existe, fica inativo** e
**não se publica**. O bot continua só com a homepage a cada 5 min. Não ligar
`ultra_premium`. Não cadastrar KREDAS.

**O que foi construído nesta noite:**

- Workflow inativo, cron 07:00 no relógio do n8n, URL
  `lista.mercadolivre.com.br/loja/{slug}/pokemon`, parser `_n.ctx.r` →
  `results[].polycard`, mesmo `filtro_titulo` / mínimo 10–15% / INSERT da vitrine,
  `search_term = loja:{slug}:catalogo`.
- Editor: <https://srv1897392.hstgr.cloud/workflow/2ckVyvFPvtqwECDI>
- Credencial Query Auth no n8n (nome na lista: **Query Auth account**). O campo **Name**
  da aba Connection tem que ser `api_key`, não o apelido da credencial. Sem isso a API
  devolve 404.

**O que foi tentado e falhou (não cobrou crédito):**

| Execução | O quê | Resultado |
| --- | --- | --- |
| `20301` | `api_key` ainda com nome errado | HTTP 404 em ~1,6 s |
| `20305` | `https://api.scraperapi.com/` | HTTP 404 |
| `20313`, `20317`, `20321` | `render=true` + `country_code=br` (URL de busca e `/_NoIndex_True`) | HTTP 500 em ~56 s; *“Protected domains may require premium=true OR ultra_premium=true”*; mesmo `etag` |
| `20333`, `20336` | **plano A:** `premium=true` + `render=true` | o mesmo 500, o mesmo texto, o mesmo `etag` |

Em 13/08 a página 1 da listagem passou duas vezes só com `render=true` (10 créditos, ~50 s,
48 produtos). Na noite de 16/08 a **página 1 também falha**. O parser local nunca viu HTML
desta sessão — o ScraperAPI desiste antes.

**Custos:** `render` = 10; `premium+render` = 25; `ultra_premium+render` = 75 (plano pago).
Falhas desta noite **não** descontaram crédito. 10 lojas/dia com premium = 250/dia (~7.500/mês),
acima do trial de 5.000.

**O que não fazer na retomada:** misturar ScraperAPI no ciclo de 5 min;
ligar `ultra_premium` sem pedido novo; publicar o Catalog Scanner; gastar crédito sem ler
esta decisão. Religar o Scanner v2 **deixou de valer** na [Decisão 43](#decisão-43--busca-geral-religada-para-cerca-de-6-posts-por-hora)
(filtro de Pokémon no título + score de autenticidade; Catalog Scanner continua inativo).

**O que mudaria esta decisão:** uma execução **manual** só de `pokemon` devolver HTTP 200
com `_n.ctx.r` e produtos (não a página de erro de 208 bytes). Aí testa `aceito` vs
`fora_do_filtro` e só então discute publicar. Node `Filtrar Loja de Teste` continua com
`TESTE_SO_POKEMON = true`.

---

## Decisão 43 — busca geral religada para cerca de 6 posts por hora

**Data:** 25/08/2026, ~22h15 BRT · **Quem decidiu:** Eduardo (pacote *busca-geral*)

**A decisão:** o canal precisa de **cerca de 6 postagens por hora** na janela 8h–22h BRT.
Para isso:

1. O `Pokemon Scanner v2` (`39kdRchYI6CwsbNY`) volta a ler
   `https://www.mercadolivre.com.br/ofertas?category=MLB6899` a cada **10 min** + jitter
   0–60s. Publicado `f0183d1c`.
2. Título **sem** a palavra Pokémon (com ou sem acento) → `descartado`. Node
   `Exigir Pokemon no Titulo`, entre o classificador e o Switch — senão a categoria TCG
   genérica solta Yu-Gi-Oh e Magic no canal.
3. Score de autenticidade **não** foi afrouxado: `AUTH_BLOCK = -40`, `AUTH_ACCEPT = +25`.
   Item duvidoso vai para `promos_review`, não para o canal.
4. Teto diário do Publisher sobe de **40 para 90** (contado em BRT). Teto horário **continua 6**.
   6/hora × 14h = 84; o 90 deixa folga. Publicado `56b8fb7b`.
5. O `Pokemon Store Scanner` **segue** nas 10 lojas a cada 5 min. O Catalog Scanner
   **continua inativo**. Sem `ultra_premium`. Sem baixar o Store Scanner para 2 min.

**Por que a fila estava vazia:** em 25/08, até ~22h, `pending_total = 0` e **zero posts no
dia**. O teto horário já era 6 ([Decisão 38](#decisão-38--teto-horário-de-6-posts)); o
Publisher não tinha o que publicar. Homepages oficiais não geram 6 ofertas **novas** por
hora. Sem fonte extra, 6/hora sustentado é impossível.

**Teste manual antes de publicar:** execução `35851` (manual, ~22h10 BRT), `success` em
~17 s. Parser `_n.ctx.r` ok (sem `erro_parser`). A vitrine noturna veio **3** cards: **0
aceito**, 2 `titulo sem pokemon`, 1 abaixo de 15%. `Log Descartado` gravou no banco
(credencial Postgres religada nos 13 nodes — [P7](troubleshooting.md#p7--nodes-postgres-sem-credencial)).
Zero `aceito` nesta hora **não** é falha do pipeline; a vitrine cresce de dia. Posts só
saem a partir das **8h de 26/08**, se houver `pending`.

**Risco assumido:** [P15](troubleshooting.md#p15--o-selo-loja-oficial-do-mercado-livre-não-significa-loja-oficial-da-pokémon).
Selo "Loja oficial" do ML ≠ loja da marca. A busca geral não tem a premissa de originalidade
da homepage Pokémon; o score e o filtro de título são o freio. Muitos itens podem ir para
revisão humana e **não** entram na fila pública.

**O que não fazer a partir daqui:** baixar `AUTH_ACCEPT` nesta primeira noite; publicar o
Catalog Scanner; misturar esta fonte com `lista.mercadolivre` / ScraperAPI.

**O que mudaria esta decisão:** Yu-Gi-Oh ou Magic no canal (filtro de título falhou);
fila de `promos_review` inchando e quase nenhum `aceito` (aí discute o limiar, com pedido
novo); teto 90 estourando cedo demais e o canal virando spam (volta o diário, não o horário).

---

## Decisão 44 — réplica de grupos de WhatsApp, sem curadoria, ao lado do bot

**Data:** 27/08/2026, ~23h BRT · **Quem decidiu:** Eduardo

**A decisão:** entra no projeto uma **segunda esteira**, independente do bot de curadoria: as
promoções que outras pessoas já publicam em grupos de WhatsApp são **copiadas como estão** para
o canal `@promopokemontcg`, trocando **apenas** o link do Mercado Livre pelo link de afiliado do
Eduardo. Nada do bot TCG é reaproveitado como filtro — **nem** tema Pokémon, **nem** desconto
mínimo, **nem** score de autenticidade, **nem** loja confiável.

O raciocínio do Eduardo: os grupos de origem já pagam o custo de garimpar promoção. Replicar é
volume barato. A curadoria fina continua existindo, mas na outra esteira.

**O que foi construído:**

| Peça | Onde | Papel |
| --- | --- | --- |
| `Replica Schema Setup` | `pfolFnCYTLyLZdwU` | Cria `replica_rotas`, `replica_config`, `replica_log`. Roda na mão |
| `Replica WhatsApp Ingest` | `4mE343XrNXgIwAIF` | Recebe da Evolution API, troca o link, publica no Telegram |
| `Replica Painel` | `lWDnggRX8xQmYyQV` | Página privada com Basic Auth: liga/desliga, libera grupo, mostra log |
| Evolution API | [`deploy/evolution-api/`](../deploy/evolution-api/) | Ponte com o WhatsApp. No ar desde 28/08 ([Decisão 45](#decisão-45--evolution-no-docker-manager-e-o-qr-code-por-página-do-n8n)) |

**As regras que sobraram** (todas técnicas, nenhuma editorial):

1. Só mensagem **de grupo**, que **não** é da própria conta, **com** texto e com menos de
   **10 min** de atraso.
2. O grupo precisa estar **liberado** no painel. Grupo novo se cadastra sozinho na primeira
   mensagem, sempre **desligado** — ver `replica_rotas.ativa`.
3. Sem link do Mercado Livre no texto, **não replica**. Exceção opcional: mensagem de cupom,
   se `replicar_cupom_sem_link = true`.
4. **Teto por hora** (padrão 40) como freio anti-flood do Telegram, não como curadoria.
5. Deduplicação por hash do texto sem links + item IDs, via `UNIQUE (hash_conteudo)`. A mesma
   promoção vinda de três grupos sai **uma** vez.
6. Única edição no conteúdo além do link: **linha de convite** para grupo/canal de terceiro é
   apagada. Não faz sentido divulgar concorrente.

**Por que Evolution API e não a API oficial:** a Cloud API da Meta não lê mensagem de grupo do
qual o número é participante comum. Ler grupo exige biblioteca não oficial (Baileys, que é o que
a Evolution embrulha). **O risco é banimento do número de WhatsApp** — por isso a recomendação é
usar um chip separado, nunca o número pessoal do Eduardo.

**O que o Eduardo aceitou junto com isso:** copiar post de terceiro sem checar preço significa
que o canal pode repetir promoção furada de quem originou. A esteira não reconfere preço (o bot
de curadoria reconfere; esta, não).

**Cuidados de segurança que já entraram:**

- O webhook de entrada saiu de `/webhook/replica/wa` para um caminho com segredo. Caminho
  adivinhável + sem autenticação = qualquer pessoa publicando no canal do Eduardo.
- A Evolution **não** ganha porta pública: `127.0.0.1:8080`, e o QR sai por dentro do n8n
  ([Decisão 45](#decisão-45--evolution-no-docker-manager-e-o-qr-code-por-página-do-n8n)). Quem
  alcança a API controla a conta de WhatsApp inteira.
- O painel exige Basic Auth, e o formulário de ajustes só aceita chave que está na lista branca
  do node `Normalizar Config`.

**O que não fazer:** ligar todos os grupos de uma vez (comece com um e olhe o log); usar o
número pessoal; expor a Evolution na internet; publicar o `Replica Schema Setup`, que é de mão.

**O que mudaria esta decisão:** número banido pelo WhatsApp (aí a esteira morre ou vira Telegram
para Telegram); grupo de origem postando link de afiliado de terceiro que a troca não cobre;
canal virando spam mesmo com o teto por hora.

---

## Decisão 45 — Evolution no Docker Manager, e o QR code por página do n8n

**Data:** 28/08/2026, ~19h BRT · **Quem decidiu:** o agente, com aval do Eduardo para prosseguir

Três escolhas de infraestrutura tomadas ao pôr a Evolution API de pé. Nenhuma muda regra de
negócio; todas mudam como se opera a esteira.

**1. Subir pelo Docker Manager da Hostinger, não por SSH.** O projeto `evolution-api` é criado
e atualizado pela API da Hostinger, que grava o compose em `/docker/evolution-api/` e roda o
`up`. Vantagem: não exige chave SSH, e o compose fica versionado no repo, igual ao que está na
VPS. Limite conhecido: quando o `up` falha, a API responde `success` mesmo assim, e os logs do
projeto só aparecem **depois** que existe container. Diagnosticar exigiu subir projetos de
teste descartáveis para isolar a causa.

**2. Imagem `evoapicloud/evolution-api`, não `atendai/evolution-api`.** A `atendai` é a que
aparece em quase todo tutorial e é o repositório antigo do projeto. Nesta VPS ela **não sobe**:
o Docker aceita, não cria container e não deixa log — nem erro de pull. A `evoapicloud`, que é
o repositório oficial atual, subiu de primeira. Versão fixada em `v2.3.7`, não `latest`, para
atualização de imagem não derrubar a sessão do WhatsApp sem aviso.

**3. O QR code sai por uma página do n8n, não por túnel SSH.** Criado o workflow
`Replica WhatsApp Conectar` (`v32gcVzRkedUACXD`): webhook com Basic Auth, cria a instância
`promo-replica` se faltar, pede o QR à Evolution e desenha na tela, recarregando sozinho a cada
25 s. O raciocínio: parear é o único momento em que um humano precisa falar com a Evolution, e
a sessão vai cair de novo algum dia. Depender de túnel SSH toda vez transforma uma reconexão de
dois minutos numa tarefa que só o agente sabe fazer. A página fica atrás do mesmo Basic Auth do
painel, e a Evolution continua sem porta pública.

**Duas coisas que só se descobriu rodando:** a senha do Postgres não é a que está no `.env` da
VPS (ver [Histórico de sustos](#histórico-de-sustos-o-que-já-deu-errado-na-infraestrutura)), e o
webhook global **não pode** usar o domínio público — de dentro do container ele resolve para
`127.0.1.1` e nenhuma mensagem chega ao n8n. Passou a apontar para `http://n8n:5678/...`, pela
rede Docker.

**O que mudaria esta decisão:** a Hostinger tirar o Docker Manager do ar (aí vira SSH); a
`evoapicloud` parar de publicar imagem (aí vira build próprio).

---

## Decisão 46 — painel origem/destino com todos os grupos da conta

**Data:** 28/08/2026, ~19h50 BRT · **Quem decidiu:** Eduardo, com o mockup de origens e destinos

**A decisão:** o `Replica Painel` deixa de ser uma lista de interruptores "Replicando/Desligado"
e passa a ser o desenho do mockup: **grupos de origem** (de onde copiar) e **grupos de destino**
(para onde enviar). A lista de grupos vem da Evolution (`GET /group/fetchAllGroups`), não só
dos grupos que já mandaram texto. Destino padrão é o Telegram `@promopokemontcg`; dá para
adicionar um grupo de WhatsApp da mesma conta.

**Por que assim, e não a lista antiga:** esperar a primeira mensagem com texto para o grupo
aparecer no painel era opaco. O Eduardo quer ver todos os grupos do número pareado e escolher
com dropdown, inclusive um destino WhatsApp além do canal.

**O que isso implica no ingest:** depois do Telegram, se houver destino WhatsApp, o mesmo texto
(já com o link de afiliado) vai via `sendText`. Origem igual a destino é recusada, para não
criar loop. Foto no WhatsApp de destino ainda não é copiada — só o texto.

**O que mudaria esta decisão:** a Evolution deixar de listar grupos (aí volta o cadastro pela
primeira mensagem); banimento do número (aí o destino WhatsApp some e fica só Telegram).

---

## Decisão 47 — token de save no JSON, porque o Chrome não reenvia Basic Auth no fetch

**Data:** 28/08/2026, ~23h00 BRT · **Quem decidiu:** o 401 no Salvar, duas vezes, com `same-origin` já publicado

**A decisão:** o GET do `Replica Painel` continua com Basic Auth. Os POSTs (`/salvar`,
`/rota`, `/config`) **não**. A página (gerada só depois do GET autenticado) manda um
**token de save** no JSON. Os nodes `Normalizar Lote` / `Normalizar Rota` /
`Normalizar Config` recusam se o token não bater. O token não é a senha do painel;
pode vir de `$env.REPLICA_PAINEL_SAVE_TOKEN` ou do fallback no Code node.

**O que foi tentado antes e falhou:** `credentials: 'same-origin'` no `fetch` (painel
`842aff7e`). O GET autenticava; o POST chegava **sem** `Authorization`; o n8n
respondia 401 **antes** do workflow rodar. Nas executions, o POST `/salvar` simplesmente
não aparecia. Chrome frequentemente não reenvia Basic Auth em `fetch()`/`XHR`.

**O que não fazer de novo:** colocar usuário/senha do Basic Auth no JavaScript; insistir
em `credentials: 'same-origin'` como correção única; exigir Basic Auth no POST e
esperar que o browser mande.

**Prova:** POST `/salvar` sem `Authorization` e sem token agora **entra** no workflow
(erro `token de save invalido`, não 401). Com token válido e payload incompleto, passa
a checagem e cai na validação de negócio. GET sem senha continua 401.

**O que mudaria esta decisão:** o Chrome passar a reenviar Basic Auth em `fetch` same-origin
(aí o POST poderia voltar a exigir Basic Auth, sem token). Ou o painel virar form POST
nativo com redirect — o browser manda Basic Auth em navegação de formulário.

---

## Decisão 48 — post da réplica no modelo foto + texto, sem marca de terceiro

**Data:** 28/08/2026, ~23h45 BRT · **Quem decidiu:** Eduardo, com o modelo da foto (caixa + DE/POR + cupom + link) e o pedido de tirar `@rasgabooster.tcg`

**A decisão:** o ingest **não** inventa um template novo. Copia o texto do grupo, troca o link de afiliado, e agora também: (1) apaga `@rasgabooster.tcg`, `#rasgaboot` e qualquer linha que seja só um `@` ou `#`; (2) manda a **foto do produto** junto com a legenda no WhatsApp de destino (`sendMedia`), no mesmo modelo da captura. Telegram já fazia `sendPhoto` quando cabia; WhatsApp saía só em `sendText` ([Decisão 46](#decisão-46--painel-origemdestino-com-todos-os-grupos-da-conta)).

**Por que adaptar o pipeline, e não um editor de modelo no painel:** o formato já vem da origem (título, ❌ DE, 👉 POR, 🏷️ cupom, link). Faltava limpar a marca e copiar a imagem. Um editor de template no site fica para depois; `replica_config.frases_remover` já aceita frases extras.

**O que isso implica:** se a origem veio sem foto, o post continua só texto — a esteira não gera imagem. Se a origem tinha foto, Telegram e WhatsApp saem com a mesma foto e o mesmo texto limpo.

**O que mudaria esta decisão:** o Eduardo quiser montar o texto do zero (aí sim um modelo no painel); ou a origem passar a mandar só texto e ele quiser puxar a thumbnail do anúncio do Mercado Livre.

---

## Decisão 49 — cupom sem produto vai para a vitrine do Eduardo, nunca para `/social/` de terceiro

**Data:** 29/08/2026, ~00h10 BRT · **Quem decidiu:** Eduardo, ao clicar no cupom replicado e cair na página da pessoa da origem

**A decisão:** se o link resolvido do Mercado Livre **não** é um produto (`/p/MLB…` ou `/MLB-123`), o ingest **não** reaproveita o caminho. Troca por `https://www.mercadolivre.com.br/social/caed1312314?matt_word=caed1312314&matt_tool=96097202&forceInApp=true`. `meli.la` passa a ser tratado como encurtador do ML.

**O que aconteceu:** o post `41702` (cupom 30% OFF, “Resgatem por aqui: https://meli.la/2XNbgSR”) resolveu para `/social/milenaoliveirar/lists/…`. O código antigo só colava o `matt_word` do Eduardo **em cima da URL dela**. O caminho `/social/milenaoliveirar` continua sendo a vitrine dela — o parâmetro de afiliado não muda de dono a página.

**Por que não manter a lista dela com o matt_word dele:** a lista (`/lists/uuid`) é da conta dela. Sem o `ref` assinado dela, e mesmo com o `ref`, o clique continua no perfil de terceiro ([Decisão 27](#decisão-27--o-formato-de-perfil-social-não-substitui-o-link-direto)).

**O que mudaria esta decisão:** o Eduardo quiser **não publicar** cupom sem produto (aí o post some em vez de apontar para a vitrine dele).

---

## Decisão 50 — card profissional no lugar da foto crua da origem

**Data:** 29/08/2026, ~00h25 BRT · **Quem decidiu:** Eduardo, fatores 5 e 6 (opção B) das melhorias da réplica

**A decisão:** o destino **não** recebe a foto original do grupo (pode ter marca de terceiro). O ingest monta um card 1080×1440 preto + faixa âmbar `#ffb800` + foto do produto + título + DE/POR + cupom + `POKEMON TCG PROMO`. A foto preferida é a thumbnail oficial do anúncio (`GET /items/MLB…`). Sem item, usa a foto da origem só como recorte no card. Sem as duas, o post segue só texto (cupom sem produto). A legenda continua sendo o texto limpo, com o link de afiliado.

**Por que não gerar imagem com IA:** volume da réplica (teto 40/h) e risco de inventar o produto. Card composto é determinístico e barato.

**O que mudaria esta decisão:** o Eduardo quiser de volta a foto crua; ou um editor de modelo no painel.

---

## Decisão 51 — fechar o HTML do painel em `pagina_gz`

**Data:** 29/08/2026, ~09h BRT · **Quem decidiu:** Eduardo, caminho A (completar o base64 no Postgres, sem reembutir o HTML no Code node)

**A decisão:** o GET do `Replica Painel` monta a página a partir de `replica_config.pagina_gz`. A coluna guarda o HTML em **base64 UTF-8** (não gzip — o nome é legado). Em 29/08 de manhã o valor estava pela metade (31712 de 63424 bytes): o browser recebia JS cortado, sem `</body></html>`, e “nada funcionava”. Os chunks 5–8 fecharam o arquivo. Tamanho final **63424**, MD5 `f8fccee12aa8e6e98ecf12d2a7221d2a`. Fonte versionada: [`backups/2026-08-28/painel/replica-painel.html`](../backups/2026-08-28/painel/replica-painel.html).

**Por que não recolocar o HTML no Code node:** o n8n e o MCP travam em payload grande; a metade que já estava no banco era idêntica ao arquivo local. Completar a coluna é o caminho mais curto e o que o node `Montar Pagina` já espera (`Buffer.from(paginaGz, 'base64').toString('utf8')` + `__DADOS__`).

**O que isso implica:** depois de gravar, o GET passa a entregar HTML completo. Se o Chrome ainda mostrar a página quebrada, é cache — **Ctrl+F5**. Para mexer no visual de novo: edite o HTML, grave o base64 em `pagina_gz` e dê Ctrl+F5 ([runbook 15.8](runbook.md#158-mexer-no-painel-mudar-a-página)).

**O que mudaria esta decisão:** voltar a embutir o HTML no Code node (aí o gerador `tools/gerar-painel-code-node.mjs` volta a ser o caminho principal).

---

## Decisão 52 — foto oficial do anúncio, mesmo quando a origem veio só com texto

**Data:** 02/09/2026 · **Quem pediu:** Eduardo (“corrigir a foto da réplica”)

**O que estava acontecendo.** Os grupos de origem quase sempre mandam **texto + link**, sem
imagem. O ingest só anexava foto se `tem_imagem` viesse da Evolution. A esteira da foto do
ML (`Tem Foto do ML?` → página/API → `Baixar Foto do Anuncio`) existia no canvas e **não
estava ligada**. Resultado em produção: Telegram e WhatsApp saíam só texto, com o produto
já identificado (`item_ids = MLB…`, `url_produto` preenchido). Execução típica: `64927`.

Pegadinha extra: o encurtador cai na vitrine `/social/` de terceiro. O `og:image` dessa
página é a foto do perfil/lista, não a do produto. Não dá para reaproveitar.

**A decisão (corrigida no mesmo dia, após o teste do Eduardo).**

A origem quase sempre manda `meli.la`. O segundo salto já devolve o HTML da vitrine
`/social/` (~360 KB), **sem anti-bot**, com polycards do produto. A foto sai dali:

1. `Montar Post` casa `product_id` / `user_product_id` com `item_ids` e lê
   `pictures.pictures[0].id` no polycard. Monta
   `https://http2.mlstatic.com/D_NQ_NP_2X_{id}-O.jpg`.
2. `Preparar Card` recebe `url_foto_html`. Se for CDN `mlstatic`, `tem_url_foto = true`
   e **pula** `Buscar Item no Mercado Livre`.
3. Sobe a thumb (`-I`/`-W` → `-O`, `D_NQ_NP_2X_`). A foto **vai inteira** — o card
   composto 1080×1440 da [Decisão 50](#decisão-50--card-profissional-no-lugar-da-foto-crua-da-origem)
   continua no canvas, desligado.
4. Sem polycard, ainda tenta a página do produto (`og:image`). Se as duas falharem,
   cai na foto da origem. Sem as três: só texto.
5. `og:image` de página `/social/` é **recusado** (é foto de perfil/lista, não do produto).
6. Se a legenda da origem **não tem nome do produto** (o título vinha só na imagem, e a
   foto oficial do ML não carrega esse texto), `Montar Post` **injeta** `titulo_produto`
   do polycard no começo da legenda. Se a origem já manda `_Box Ursaluna…_`, não duplica.

**O que foi tentado e falhou no teste `65110` (02/09 ~14h12 BRT).** A primeira versão
desta decisão (`d90d6d88`) buscava a página `/p/` do produto, no mesmo espírito do
Publisher. A VPS recebeu HTML de `suspicious-traffic-frontend`. O Publisher continua
lendo **ofertas/`www` de vitrine**; a PDP `/p/` é outra superfície. A API
`api.mercadolibre.com/items|products` devolve 401/403 a partir de alguns IPs — não é
plano B. O polycard do hop2 já estava no HTML da execução (`752085-MLA99977285401_112025`,
CDN 200, JPEG ~279 KB) e o `Montar Post` publicado deixava `url_foto_html` vazio.

No teste com foto (`65180`, `65186`) a origem RasgaBooster mandava **só preço + cupom +
link**: o nome estava na imagem. A foto oficial do ML saiu certa e a legenda ficou sem
título. Ingest `70a5d99d` injeta o nome. Painel `d4604a4b` destaca o título nos logs e
volta a gravar o `save_token` (estava vazio; Config/Rotas falhavam com *token de save
invalido*).

Code nodes em [`backups/2026-09-02/code-nodes/`](../backups/2026-09-02/code-nodes/).
Ingest publicado `70a5d99d`. Painel `d4604a4b` (`versionId` = `activeVersionId`).

**O que mudaria esta decisão:** religar o card composto se o Eduardo quiser marca na
imagem de novo; ou o HTML do encurtador deixar de trazer polycard — aí volta a testar
a página `/p/` **a partir do n8n na VPS**, não deste ambiente.

---

## Histórico de sustos: o que já deu errado na infraestrutura

Não são decisões, são cicatrizes. Valem registro porque a chance de repetição não é zero.

**Os workflows já se perderam uma vez.** Num redeploy do n8n, o volume Docker foi recriado e
os três workflows criados minutos antes desapareceram. Workflows antigos de outros projetos
sobreviveram. Tudo foi recriado — é por isso que os nomes têm "v2". Lição: exporte os
workflows antes de mexer no n8n.

**A credencial do banco parou por causa da rede Docker.** O redeploy do n8n recriou a rede
`n8n_default`, e o container do PostgreSQL ficou preso na rede antiga. A credencial estava
correta e mesmo assim não conectava. Foi preciso recriar o projeto do PostgreSQL para ele se
religar. Restart simples não resolve, porque não reavalia a configuração de rede. Detalhes em
[troubleshooting P5](troubleshooting.md#p5--credencial-do-banco-para-de-conectar-couldnt-connect-with-these-settings).

**A senha do banco foi engolida pelo Docker — e continua engolida.** A senha continha `$`, e o
Docker Compose interpretou o que vinha depois como nome de variável de ambiente. O container
recebeu uma senha diferente da escrita no arquivo, e a autenticação falhava sem motivo aparente.
Em 28/08 isso mordeu de novo: a Evolution API não conectava, com `P1000: Authentication failed`,
porque foi configurada com a senha **do arquivo**. O `.env` da VPS diz
`PkmnPromos2026!Br$ecure`, mas **a senha que o banco aceita é `PkmnPromos2026!Br`** — o `$ecure`
nunca chegou ao Postgres. Lição dupla: evite `$` em senha de docker-compose (ou escape como
`$$`), e, quando ligar serviço novo nesse banco, confie na senha efetiva, não no arquivo.

**Uma auditoria encontrou 17 bugs de uma vez**, vários deles capazes de impedir o bot de
funcionar sozinhos: 16 nodes sem credencial vinculada, as 7 consultas SQL do Scanner sem o
prefixo `=` de expressão, o Switch com os três destinos na mesma saída, saídas de erro
ligadas na saída de sucesso, o `utm_link` não sendo gravado, o Publisher usando `permalink`
em vez de `utm_link`, e a falta de escape de HTML. Todos corrigidos. Lição:
**editar workflow por programa e não testar é como se acumula isso.** O checklist do que mais
quebra está em [troubleshooting P14](troubleshooting.md#p14--mexi-no-workflow-e-quebrou).

**A correção do prefixo `=` se perdeu e teve de ser refeita.** Uma edição posterior sobrescreveu
uma correção anterior. É o argumento mais forte a favor de rodar o workflow na mão depois de
cada mudança, em vez de confiar que "eu já arrumei isso".

**14/08: canal mudo o dia inteiro com o bot saudável.** Scanner e Publisher ativos, zero
erro, fila `pending = 0`. Às 18:20 o Scanner marcou 7 `aceito` (15–33% OFF) que já
estavam `posted`. `INSERT ON CONFLICT DO NOTHING` não reenfileira. Lição: `aceito` no
log **não** significa item novo na fila. Só volta se o preço cair (Decisão 33) ou se
alguém devolver o status a `pending` à mão — e isso não deve ser feito duas vezes no
mesmo lote. Detalhe em [estado-atual](estado-atual.md#1408--teste-de-fim-de-semana-18h43-brt)
e [troubleshooting P1](troubleshooting.md#p1--o-bot-não-está-postando-nada).
