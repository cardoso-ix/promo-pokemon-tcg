# Roadmap

O que ficou **de fora** do MVP e o que faria sentido depois. Nada aqui está em andamento.

A ordem abaixo é por relação entre valor e esforço, não por ordem obrigatória. E vale a
regra geral do projeto: **nada disso é mais importante do que ligar o bot e observar o
comportamento real por alguns dias.** Otimizar antes de ter dados é chutar.

---

## Próxima sessão (atualizado em 29/08/2026, ~09h16 BRT)

1. ~~**Subir a Evolution API e publicar os workflows da réplica.**~~ **Feito em 28/08**
   ([Decisão 45](historico-de-decisoes.md#decisão-45--evolution-no-docker-manager-e-o-qr-code-por-página-do-n8n)).
2. ~~**Ligar o primeiro grupo e observar.**~~ **Feito em 28/08 à noite.** Rota **TCG Promo**
   gravada; ingest publicando. O card profissional substituiu a foto crua
   ([Decisão 50](historico-de-decisoes.md#decisão-50--card-profissional-no-lugar-da-foto-crua-da-origem)).
3. ~~**Fechar o HTML do painel em `pagina_gz`.**~~ **Feito em 29/08 de manhã**
   ([Decisão 51](historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz)).
   Se o browser ainda mostrar JS cortado, Ctrl+F5.
4. **Construir a Fase 1 do dashboard único.** Decidido em 28/08: **estender o `Replica Painel`**
   e mirar controle total sobre a curadoria, em três fases. A Fase 1 não toca em workflow
   publicado. O desenho está em [Dashboard](#dashboard). A réplica já rodou o bastante para
   começar a tela unificada sem construir em cima de um pipeline ainda mudo.

---

## Pendências imediatas (não são roadmap, são o que falta fechar)

Revisado em 14/08/2026, **~18h43 BRT**, conferindo o estado real no n8n.

1. ~~**Regravar o `utm_link` dos itens da fila e religar o `Pokemon Publisher v2`.**~~
   **Feito em 13/08/2026.**
2. ~~**Confirmar no painel de afiliados que o clique de um post real foi atribuído.**~~
   **Feito em 13/08:** 5 cliques (conta do Eduardo). **Venda/comissão ainda não.**
2b. ~~**Pacote A: qualidade antes de volume.**~~ **Feito em 13/08 ~22h35** ([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)):
    mínimo 10%/15%, fila por qualidade. Teto horário subiu de 4 para **6** em 14/08
    ([Decisão 38](historico-de-decisoes.md#decisão-38--teto-horário-de-6-posts)), Publisher `57c2826e`.
2c. ~~**Filtro: cartas Pokémon e acessórios TCG.**~~ **Feito em 14/08 ~18h36** ([Decisão 37](historico-de-decisoes.md#decisão-37--cartas-pokémon-no-plural-e-acessórios-de-tcg-com-pokémon-no-título));
    **ampliado em 16/08** ([Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova)):
    figura/boneco Pokémon entra; Funko e merch continuam fora. Escala Miniaturas sem `\bcartas\b`.
    Loja oficial nova nesta rodada: nenhuma. `dalo-vendas` já estava autorizada.
2d. ~~**Construir o Catalog Scanner (ScraperAPI).**~~ **Criado inativo em 16/08**
    (`2ckVyvFPvtqwECDI`). A listagem falhou com `render` e com `premium`
    ([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).
    **Não publicar.** `ultra_premium` só com pedido novo.
3. **Conferir se os quatro nodes da trilha de revisão do `Pokemon Scanner v2` têm credencial do
   banco vinculada** (`Insert Review`, `Queue Review`, `Log Review`, `Log Review Error`). Esse
   workflow está desativado por escopo — a checagem só importa se ele voltar a ser usado.

E duas de limpeza:

4. **Apagar os posts de teste do canal.** Ficaram no canal as mensagens de teste de formato
   (`message_id` 7, 11 e 12, sendo a 12 com um cupom fictício).
5. ~~**Arquivar o `TMP Pokemon SQL Console 2`** (`Fc7OGlP4ZNiuNIgd`).~~ **Feito em 27/08.**
   O `PVNsBGQ92Wrhos51` também já estava arquivado.

---

## Shopee

**O que seria:** adicionar a Shopee como segunda fonte de promoções, ampliando muito o volume
e o alcance do canal.

**Por que ficou de fora:** a Shopee não tem API pública de busca aberta, e o anti-bot dela é
mais agressivo que o do Mercado Livre. Havia dois caminhos e nenhum estava pronto:

- **Shopee Affiliate API** — exige cadastro e aprovação como afiliado em
  `affiliate.shopee.com.br`. É o caminho certo, mas depende de aprovação que ninguém pediu
  ainda.
- **Scraping** — tecnicamente possível, mas com risco alto de bloqueio, e o mesmo problema
  estrutural do Mercado Livre: o formato da página muda e o parser quebra.

**Pré-requisito real:** o Eduardo se cadastrar como afiliado Shopee e conseguir aprovação da
API. Sem isso, não vale começar.

**Como encaixaria na arquitetura:** relativamente bem. Seria um **terceiro workflow**
(`Shopee Scanner`) escrevendo na mesma tabela `promos`, e o Publisher publicaria de qualquer
fonte sem saber a diferença. Seria preciso adicionar uma coluna `marketplace` em `promos` para
distinguir a origem, e um segundo formato de link de afiliado.

---

## WhatsApp

**O que seria:** publicar as mesmas promoções num grupo ou lista de WhatsApp, em paralelo ao
Telegram.

**Por que ficou de fora:** é a segunda fase por decisão de escopo — o MVP era Telegram. Há
dois caminhos:

- **Hermes** — a ponte de mensagens que o Eduardo já tem conectada. Seria o caminho de menor
  custo. Foi verificado que dá para **ler** mensagens de grupos por ali; publicar é o passo
  seguinte.
- **WhatsApp Business API** — profissional e confiável, com custo por mensagem (na ordem de
  R$ 0,08). Vale se o canal crescer.

**Como encaixaria:** um node de WhatsApp no Publisher, em paralelo ao node do Telegram, na
mesma execução. Um cuidado: a mensagem do WhatsApp precisaria de formatação própria, porque
ele não entende HTML nem tem botão inline — o link teria de voltar para o corpo do texto, e aí
o cuidado com caracteres especiais volta a importar.

---

## Ler o formato do grupo de WhatsApp como referência de design

**O que seria:** o Eduardo indicou um grupo de WhatsApp de promoções como referência de
formato que ele gosta. A ideia era ler as mensagens desse grupo pelo **Hermes** e extrair o
padrão: como estrutura título, preço, desconto, cupom, chamada para ação, uso de emoji,
quebras de linha, tom de voz, uso de urgência.

**Estado:** não realizado. Não é possível entrar em grupo de WhatsApp por link a partir de um
agente, e a leitura pelo Hermes depende do Eduardo já ser membro do grupo e do WhatsApp estar
conectado na ponte. O formato atual do post foi construído a partir de boas práticas de canais
de promoção brasileiros, não da referência específica.

**Valor:** moderado e barato. Se o Eduardo gosta especificamente daquele estilo, copiar o que
funciona num grupo com público real é melhor que adivinhar.

---

## Análise com IA

**O que seria:** usar um modelo de linguagem (a ideia registrada era **DeepSeek v4**, via
OpenCode ou OpenRouter) como camada adicional de classificação. Não para substituir o filtro
de autenticidade atual, mas para o que regra não pega bem:

- Julgar relevância real do produto para o nicho, além do que a categoria garante
- Avaliar casos ambíguos da fila `promos_review` automaticamente, reduzindo trabalho manual
- Gerar descrição enriquecida do produto para o post
- Reforçar a detecção de falsificação lendo a **descrição** do anúncio, não só o título — que
  é onde muita informação reveladora mora e onde o filtro atual não olha

**Por que ficou de fora:** o filtro determinístico foi implementado primeiro, de propósito.
Ele é auditável (o motivo completo fica gravado em texto), grátis, instantâneo e não depende
de serviço externo. IA aqui tem três custos: dinheiro por chamada, latência, e — o mais
importante — **imprevisibilidade**, que é ruim justamente num filtro cuja função é proteger
credibilidade.

**A ordem certa:** deixar o filtro atual rodar, acumular casos reais em `promos_review` e
`promos_log`, e **só então** avaliar se a IA melhoraria de fato aqueles casos concretos. Com
dados na mão a decisão é fácil; sem dados é fé.

**Como encaixaria:** um node de HTTP Request no Scanner, entre `Normalize and Classify` e
`Route by Decision`, chamado apenas para os itens que caíram na zona cinzenta — assim o custo
fica limitado aos casos ambíguos, que são poucos.

---

## Mais volume de ofertas

**O problema:** a vitrine das lojas oficiais rende poucos TCG em oferta por ciclo, e com a
deduplicação o volume novo por dia fica bem abaixo do teto de 40 posts. O canal posta pouco.

**Caminhos possíveis, do mais barato ao mais caro:**

0. **Catalog Scanner (já existe, inativo).** Varre a listagem `/loja/{slug}/pokemon` via
   ScraperAPI. Em 16/08 a página 1 falhou com `render=true` e com `premium=true`. Retomar
   só com HTTP 200 e `_n.ctx.r` numa execução manual de `pokemon`
   ([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).
1. **Mais URLs de ofertas.** A página aceita outros filtros e ordenações. Cada URL nova é uma
   requisição a mais por ciclo. Barato e sem risco novo.
2. **Paginação.** Ler a segunda e a terceira página de ofertas da mesma categoria.
3. **Ampliar categorias.** Foi avaliado incluir Brinquedos e Hobbies (`MLB1132`) para pegar
   fichários, álbuns, pokébolas e lotes. Custaria cerca de 8 requisições por ciclo **e exigiria
   reintroduzir filtro por palavra-chave no parser**, que hoje não existe justamente porque a
   URL de ofertas já garante que tudo que chega é do nicho. O Eduardo optou por ficar só em
   cartas, priorizando zero ruído.
4. **Voltar à página de busca com proxy.** Daria busca por termos ("booster box", "elite
   trainer box") e muito mais volume, mas exige proxy residencial pago e adiciona uma
   dependência externa que o projeto evitou de propósito.

**Antes de fazer qualquer um:** confirme que o volume baixo é realmente incômodo. Canal de
nicho com 5 promoções boas por dia pode ser melhor que canal com 30 posts medianos.

---

## Monitoramento de queda de preço

~~**O que seria:** um terceiro workflow que reconsulta preços e alerta no canal.~~

**Feito em parte em 13/08/2026 (Decisão 33).** O Store Scanner já reenfileira o **mesmo
`item_id`** já `posted` quando o preço **da vitrine** (polycard) cai ≥ 5% ou ≥ R$ 5, no
máximo 1/dia. O Publisher manda um **post novo**; o post antigo no Telegram **não é editado**.

O que **ainda não existe:** consultar a página individual do produto (checkout / preço
logado) e editar a mensagem antiga via `telegram_message_id`. Preço de checkout logado
foi recusado de propósito — só vale o que o público vê na vitrine.

---

## Dashboard

**Pedido do Eduardo em 27/08:** um painel só dele para controlar **as duas esteiras**, no
espírito do que o Connect Afiliado faz. Isso deixou de ser o item de menor prioridade da lista.

**O que já existe:** o `Replica Painel` (`lWDnggRX8xQmYyQV`), servido pelo próprio n8n em
`/webhook/replica/painel` com Basic Auth. Desde 28/08 ele segue o modelo origem/destino
([Decisão 46](historico-de-decisoes.md#decisão-46--painel-origemdestino-com-todos-os-grupos-da-conta)):
lista todos os grupos da conta pareada, escolhe origens e destinos (Telegram e WhatsApp) e
mostra as últimas mensagens vistas. O HTML mora em
[`backups/2026-08-28/painel/`](../backups/2026-08-28/painel/) e em produção sai de
`replica_config.pagina_gz` ([Decisão 51](historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz)).
O gerador [`tools/gerar-painel-code-node.mjs`](../tools/gerar-painel-code-node.mjs) é o
paraquedas se o HTML voltar para o Code node.

**O que falta para virar o painel único.** O bot de curadoria hoje só se opera por SQL e pela
tela do n8n. Numa mesma página caberia:

| Bloco | O que mostraria / permitiria | De onde vem |
| --- | --- | --- |
| Visão do dia | Posts por esteira, fila `pending`, erros das últimas 24h | `promos`, `promos_erros`, `replica_log` |
| Liga/desliga por esteira | Pausar a curadoria e a réplica de forma independente | Publisher no n8n; `replica_config.ativo` |
| Lojas | Ligar/desligar loja, ver rendimento de cada uma | `lojas_confiaveis` ([runbook, seção 13](runbook.md#13-escopo-quais-lojas-o-bot-pode-publicar)) |
| Fila e revisão | Aprovar ou descartar item de `promos_review` num clique | `promos_review` ([runbook, seção 4](runbook.md#4-revisar-a-fila-de-revisão-humana)) |
| Cupons | Cadastrar cupom sem escrever SQL | `cupons` ([runbook, seção 3](runbook.md#3-cadastrar-um-cupom)) |
| Grupos de origem e destino | O que o `Replica Painel` já faz | `replica_rotas`, `replica_destinos` |

**As duas escolhas foram feitas em 28/08 pelo Eduardo:** **estender o `Replica Painel`** (não
criar serviço novo) e chegar a **controle total** sobre a curadoria, não só leitura.

Controle total esbarra em duas coisas que não são trabalho de tela, e por isso o combinado é
fazer em três fases:

**Fase 1 — o painel unificado com o que já é seguro.** Leitura das duas esteiras (visão do dia,
fila, erros, saúde) mais as ações que são só `UPDATE` em tabela: ligar/desligar loja, editar
filtro de título e desconto mínimo por loja, republicar e descartar item da fila, cadastrar
cupom. **Não toca em nenhum workflow publicado.**

**Fase 2 — tirar os números de dentro dos workflows.** Teto por dia, teto por hora, janela de
horário e os mínimos de 10%/15% estão escritos nos Code nodes do Publisher e dos Scanners, não
no banco. Para o painel poder mudá-los é preciso criar uma tabela de configuração e alterar
**três workflows que estão no ar**, testando cada um. Lembrar de
[P14](troubleshooting.md#p14--mexi-no-workflow-e-quebrou): a auditoria dos 17 bugs nasceu de
editar workflow por programa sem rodar depois.

**Fase 3 — aprovar/editar o texto antes de publicar.** É mudança de comportamento, não de tela:
hoje o Publisher tira da fila e posta sozinho a cada 2 min. Com aprovação manual, o item para
num estado de espera e o canal **fica mudo se o Eduardo não abrir o painel**. Decidir com calma,
depois de ver as fases 1 e 2 rodando.

O argumento antigo contra o dashboard — de que as consultas do
[runbook](runbook.md#7-calibrar-os-filtros-olhando-os-dados) já respondem tudo por copiar-colar —
continua válido para relatório, mas não para **operação**. Liberar grupo de WhatsApp e aprovar
item de revisão são tarefas de clique, não de SQL.

---

## Alerta automático de falha

~~**O que seria:** o bot avisar ativamente — numa mensagem privada no Telegram para o Eduardo —
quando o parser quebrar ou quando `promos_erros` receber linhas novas.~~

**Feito em 13/08/2026.** O workflow `Pokemon Health Alert` (`3irgeWFKZGZZrJ5u`) está **ativo**,
roda às 21h BRT e também na mão. O destino é o **mesmo chat privado do alerta LinkedIn**
(workflow `LinkedIn Post Diario Texto`, nodes `Notify Telegram`), não o canal público
`@promopokemontcg`. Fila vazia **não** gera alerta. Como ligar/desligar e o que ele não
cobre: [runbook, seção 14](runbook.md#14-alerta-privado-de-saúde-do-bot). Registro:
[Decisão 28](historico-de-decisoes.md#decisão-28--alerta-privado-de-saúde-no-mesmo-chat-do-linkedin).

---

## Perfil social do afiliado como "link da bio"

**O que seria:** preencher o perfil social do Eduardo no painel de afiliados e divulgar a URL
dele como link fixo do canal — na descrição ou numa mensagem fixada. O perfil **já existe**
como **TCG Booster Promo** em `mercadolivre.com.br/social/caed1312314`, com nome e descrição
prontos, mas hoje responde "Este perfil ainda está vazio": falta criar as listas de
recomendações.

**Por que vale:** é a forma de ter o ganho de marca do formato social sem pagar o custo dele.
Quem entra pela vitrine circula por vários produtos, todos comissionados.

**O que não muda:** o **botão de compra de cada post continua com o link direto** do produto.
Trocar o link dos posts pelo formato social foi avaliado e recusado
([Decisão 27](historico-de-decisoes.md#decisão-27--o-formato-de-perfil-social-não-substitui-o-link-direto)).

**Esforço:** manual, no Portal do Afiliado e pelo computador — o bot não participa disso.
Montar as listas leva alguns minutos, e vale revisar de vez em quando, porque anúncio sai do
ar.

---

## Melhorias de robustez que valeriam a pena

Pequenas, sem glamour, e que evitam dor futura:

- ~~**Criar a tabela `cupons` dentro do `Pokemon Schema Setup v2`.**~~ **Feito em 13/08/2026.**
  O workflow de setup passou a criar `cupons` e os 7 índices de desempenho que também viviam
  fora dele. Um banco recriado do zero já nasce completo.
- ~~**Detectar e desviar item impublicável.**~~ **Feito em 13/08 para afiliado e para
  thumbnail vazio / sem `http`** ([Decisão 24](historico-de-decisoes.md#decisão-24--nunca-publicar-sem-link-de-afiliado),
  [Decisão 26](historico-de-decisoes.md#decisão-26--item-sem-foto-também-para-de-travar-a-fila)).
  **Ainda falta:** foto com URL `http` que o Telegram recusa no `sendPhoto` (link quebrado).
  Aí o item continua no topo da fila. Caminho: no `Log Publish Error`, marcar como `blocked`
  depois da falha do Telegram.
- **Usar a coluna `retries` de `promos_erros`.** Ela existe na tabela e nenhum node a usa.
- **Limpeza periódica de `promos_log` e `promos_erros`.**
- **Mover o token do Health Alert para credencial do n8n**, em vez da URL HTTP do node.
- **Exportar um backup novo** depois do ritmo 5/2 min e do Health Alert — a pasta
  `backups/2026-08-13/` está atrasada nesses pontos.
