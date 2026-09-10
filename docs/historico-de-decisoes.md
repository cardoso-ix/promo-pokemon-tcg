# Histórico de decisões — réplica

Este arquivo impede refazer caminho já descartado. Só entram decisões da **réplica**.

A esteira de curadoria (Scanner + Publisher) foi aposentada em 31/08/2026
([Decisão 57](#decisão-57--curadoria-aposentada-fica-só-a-réplica)). As decisões 1–43
eram dela e saíram desta pasta de propósito.

---

## Decisão 58 — cópia idêntica, só o afiliado muda

**Data:** 01/09/2026 · **Quem decidiu:** Eduardo (referência: Connect Afiliado)

A réplica copia o post do grupo origem **igual**. Única alteração: link do Mercado
Livre → `matt_word` / `matt_tool`. Sem ML, o post também sai (texto, cupom, aviso,
foto). `fromMe` na origem copia; loop no destino WA continua bloqueado. Sem
`formato_post` / card canvas. Dedup por `chat_id` + `message_id`.

**O que mudaria esta decisão:** voltar a exigir link ML ou a reformatar o post.

---

## Decisão 57 — curadoria aposentada, fica só a réplica

**Data:** 31/08/2026 · **Quem decidiu:** Eduardo

**A decisão:** o projeto deixa de ter post automático garimpado no Mercado Livre.
Scanner, Publisher, Health Alert e Schema Setup da curadoria foram **despublicados e
arquivados**. A documentação e os backups `2026-08-13`, `2026-08-14` e `2026-08-16`
saem do repo. O que continua é a réplica: painel + Ingest → Telegram e WhatsApp.

**O que não foi apagado:** tabelas `promos_*` no Postgres (irreversível; a réplica não
as usa). Posts antigos no canal. Workflows arquivados no n8n (dá para desarquivar se
alguém pedir, mas o default é não religar).

**O que mudaria esta decisão:** pedido explícito para religar a curadoria.

---

## Decisão 44 — réplica de grupos de WhatsApp, sem curadoria

**Data:** 27/08/2026 · **Quem decidiu:** Eduardo

Copia a promoção do grupo como está, troca **só** o link de afiliado, sem filtro de
tema, desconto, loja ou autenticidade. Evolution (Baileys) porque a Cloud API da Meta
não lê grupo de participante comum. **Risco: ban do número.** Chip separado.

Regras técnicas: só grupo; origem liberada no painel; sem link do ML não replica
(exceto cupom, se ligado); teto 40/h; dedup por `hash_conteudo`; apaga linha de
convite de terceiro.

Webhook com segredo. Evolution sem porta pública. Painel com Basic Auth.

---

## Decisão 45 — Evolution no Docker Manager, QR por página do n8n

**Data:** 28/08/2026

1. Sobe pelo Docker Manager da Hostinger, compose em [`deploy/evolution-api/`](../deploy/evolution-api/).
2. Imagem `evoapicloud/evolution-api` v2.3.7 — a `atendai` **não sobe** nesta VPS.
3. QR no workflow `Replica WhatsApp Conectar`, atrás do Basic Auth do painel.

Webhook da Evolution: `http://n8n:5678/...`, não o domínio público (resolve para
`127.0.1.1` de dentro do container). Senha do Postgres: a efetiva, não a do `.env`.

---

## Decisão 46 — painel origem/destino com todos os grupos da conta

**Data:** 28/08/2026 · **Quem decidiu:** Eduardo

Lista todos os grupos da conta (Nomes Sync / `fetchAllGroups`), não só os que já
mandaram texto. Destino padrão Telegram; WhatsApp opcional. Origem = destino é recusada.

---

## Decisão 47 — token de save no JSON

**Data:** 28/08/2026

GET do painel: Basic Auth. POSTs: **token no JSON**. O Chrome não reenvia Basic Auth
em `fetch()`. Não colocar usuário/senha do painel no JavaScript.

---

## Decisão 48 — foto + texto, sem marca de terceiro

**Data:** 28/08/2026

Copia o texto, troca o link, apaga `@rasgabooster.tcg` / `#rasgaboot` / linha só de
`@` ou `#`, manda a foto no WhatsApp de destino (`sendMedia`). Sem foto na origem,
sai só texto. `frases_remover` aceita extras.

---

## Decisão 49 — cupom sem produto vai para a vitrine do Eduardo

**Data:** 29/08/2026

Link que não é produto (`/p/MLB` ou `/MLB-123`) vira
`https://www.mercadolivre.com.br/social/caed1312314?matt_word=…&matt_tool=…`.
Não colar o `matt_word` em cima do `/social/` de terceiro.

---

## Decisão 50 — card profissional (depois desviado)

**Data:** 29/08/2026

O ingest monta um card 1080×1144. **Atualização 30/08:** o destino passou a receber
a foto inteira 2X; o card ficou no workflow, desviado — [Decisão 54](#decisão-54--foto-inteira-2x-no-destino-card-desviado).

---

## Decisão 51 — HTML do painel em `pagina_gz`

**Data:** 29/08/2026

GET lê `replica_config.pagina_gz` (base64 UTF-8, não gzip). Completar a coluna, não
reembutir HTML no Code node. Ctrl+F5 se o Chrome cachear JS cortado.

---

## Decisão 52 — produto da vitrine `/social/` sai do HTML

**Data:** 29–30/08/2026

`meli.la` `/social/` não traz o MLB. Ler `og:title`, `og:image`, `/up/MLBU`.
**Não** o primeiro `/p/MLB` (bug do Mewtwo). Foto: `og:image` + download com
User-Agent. `getMedia` → 400; API `/items/` → 403.

---

## Decisão 53 — SyntaxError em `metaDoHtml`

**Data:** 29/08/2026

Regex com `["\\']` deixou a réplica muda. Publicado com `String.fromCharCode`.
Salvar não basta — precisa **Publish**. [P21](troubleshooting.md#p21--a-réplica-está-muda-syntaxerror-em-metadohtml).

---

## Decisão 54 — foto inteira 2X no destino; card desviado

**Data:** 30/08/2026 · **Quem decidiu:** Eduardo (Box Mega Zeraora “cortado”)

Destino recebe a foto inteira do anúncio (variante 2X). Card 1080×1144 não vai ao
Telegram/WhatsApp. Post antigo não foi republicado.

---

## Decisão 55 — painel CRT, um escritor só

**Data:** 30/08/2026

Mundo CRT (`#07050f`, orbs, scanlines), responsivo. Sem fundo anime.
`pagina_gz`: 71364 bytes, MD5 `adf87ccf658e4b089798562cb99255f6`.
**Um escritor só** na coluna — corrida de chunks já cortou de novo.

---

## Decisão 56 — preço do WhatsApp sem cashtag

**Data:** 30/08/2026

Caption WA: `R$ 150,00` com ZWSP depois do `$`. Telegram HTML não muda.

---

## Histórico de sustos (réplica / infra)

- Workflows já sumiram num redeploy do n8n. Exporte antes de mexer na VPS. [P6](troubleshooting.md#p6--os-workflows-desapareceram-do-n8n).
- Credencial do banco parou porque a rede Docker foi recriada. [P5](troubleshooting.md#p5--credencial-do-banco-para-de-conectar).
- Senha do `.env` com `$` não é a senha do banco. Evolution já tomou `P1000` por isso.
- Editar workflow por programa e não testar acumula bug. [P14](troubleshooting.md#p14--mexi-no-workflow-e-quebrou).
- `pagina_gz` cortado duas vezes (coluna pela metade / vários writers). [P20](troubleshooting.md#p20--o-painel-da-réplica-abre-mas-nada-funciona).
