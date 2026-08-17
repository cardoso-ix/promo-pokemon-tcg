# Estado atual — o que está rodando e o que falta decidir

**Última atualização:** 16/08/2026, ~23h10 BRT
**Situação:** **o bot está no ar de ponta a ponta e só publica com link de afiliado e com
foto.** Dez lojas ativas (`dalo-vendas` entrou à noite, autorização do Eduardo), desconto mínimo **10%** em `pokemon`/`copag` e **15%** nas outras
([Decisão 35](historico-de-decisoes.md#decisão-35--pacote-a-qualidade-antes-de-volume)), teto
**40**/dia (contado em **BRT**) e **6**/hora. Scanner a cada **5 min**, Publisher a cada
**2 min** (8h–22h BRT). Item já postado volta à fila se o preço cair (≥ 5% ou ≥ R$ 5)
ou se continuar válido **depois de 3 dias**
([Decisão 40](historico-de-decisoes.md#decisão-40--reofertar-após-3-dias-e-contar-o-teto-em-brt)).
Cupom `BRINQUEDOS` era até 16/08 23h59 BRT. Link de compra leva `wid`. Publisher `7261bee7`,
Scanner `0ff36da8`. Filtro vigente: cartas/acessório TCG **ou** figura Pokémon
([Decisão 41](historico-de-decisoes.md#decisão-41--figuras-pokémon-no-filtro-e-nenhuma-loja-oficial-nova)).
O `Pokemon Catalog Scanner` **existe e fica inativo** — `lista.mercadolivre.com.br` falhou
com `render=true` e com `premium=true` nesta noite
([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).

Este documento existe para permitir retomar sem repetir nenhum teste pago e sem refazer
investigação que já foi feita.

**Como retomar em 5 minutos**

1. README → o bot está no ar? 10 lojas, 5 min / 2 min, teto 40 + 6/hora, mínimo 10%/15%,
   filtro de cartas/acessório + figura (Decisão 41). Catalog Scanner **não** se publica.
2. Este arquivo → versões publicadas, ScraperAPI, o que falta decidir.
3. n8n: `versionId` = `activeVersionId` nos três ativos. Salvar ≠ publicar ([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).
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
   Mínimo **10%** em `pokemon`/`copag`, **15%** nas outras oito. Teto **40**/dia e **6**/hora (era 4 na
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

**Alerta privado no ar (19h35).** O `Pokemon Health Alert` avisa no mesmo chat do alerta
LinkedIn se o bot quebrar. Fila vazia **não** é alerta. Ver
[runbook, seção 14](runbook.md#14-alerta-privado-de-saúde-do-bot) e
[Decisão 28](historico-de-decisoes.md#decisão-28--alerta-privado-de-saúde-no-mesmo-chat-do-linkedin).

---

## Estado dos workflows no n8n

Conferido no n8n em **16/08/2026 ~23h12 BRT** (`versionId` = `activeVersionId` nos três ativos),
comparando `versionId` com `activeVersionId` — porque salvar e publicar são coisas diferentes
([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

| Workflow | ID | Estado | Produção em dia? |
| --- | --- | --- | --- |
| `Pokemon Store Scanner` | `PNwaF3BYhj5KA8eY` | **Ativo**, a cada **5 min** + jitter 0–60s | Sim, `0ff36da8` — queda de preço + reoferta após 3 dias ([Decisão 40](historico-de-decisoes.md#decisão-40--reofertar-após-3-dias-e-contar-o-teto-em-brt)). Node do relógio: `A Cada 5 Minutos` |
| `Pokemon Publisher v2` | `FXNWeT9C7dEA0DUY` | **Ativo**, a cada **2 min** | Sim, `7261bee7` — teto **6**/hora + teto 40 no **dia BRT**. Node do relógio: `Every 2 Minutes` |
| `Pokemon Scanner v2` | `39kdRchYI6CwsbNY` | Inativo, fora de escopo | Nunca publicado; link de afiliado já corrigido no código salvo |
| `Pokemon Schema Setup v2` | `F8jVi6NFxeDHfAkb` | Inativo, roda sob demanda | Nunca publicado |
| `Pokemon Catalog Scanner` | `2ckVyvFPvtqwECDI` | **Inativo**, nunca publicado | Criado 16/08. `lista.mercadolivre` falha com render e com premium ([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)). **Não publicar.** |
| `Pokemon Health Alert` | `3irgeWFKZGZZrJ5u` | **Ativo**, 1× ao dia às 21h BRT + manual | Sim, `b5e4b758` — mesmo chat privado do alerta LinkedIn |
| `TMP Pokemon SQL Console` | `PVNsBGQ92Wrhos51` | **Arquivado** em 13/08 | Era descartável. Some da lista |
| `TMP Pokemon SQL Console 2` | `Fc7OGlP4ZNiuNIgd` | Ativo só para consulta à mão | Cron dummy `0 0 4 29 2 *` (29/fev). Salvo e publicado podem divergir — rode em **manual** se for consultar. Pode arquivar |

Scanner v2 e Schema Setup nunca publicados é inofensivo enquanto ninguém os ligar. O
**Catalog Scanner** também nunca foi publicado — e **não se publica** até a listagem
devolver HTML de verdade ([Decisão 42](historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).

A pasta [`backups/2026-08-13/`](../backups/) tem os 4 workflows originais daquele dia.
[`backups/2026-08-16/`](../backups/2026-08-16/) guarda o parser e o gerador do Catalog
Scanner **inativo**. O n8n continua sendo a fonte; o backup é paraquedas.

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
  qualidade (10%/15%) e o ritmo do canal (6/hora). Cadastrar loja nova ou religar o Scanner
  v2 continuam sendo decisões do Eduardo, listadas no
  [README](../README.md#o-que-depende-de-uma-decisão-do-eduardo).
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
