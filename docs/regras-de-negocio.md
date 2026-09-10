# Regras de negócio — réplica

Só valem as regras desta página. Não existe filtro de desconto, tema, loja, autenticidade,
janela de horário nem teto diário. Quem filtra é o grupo de origem.

---

## Mapa: onde mora cada parâmetro

| O que | Onde muda |
| --- | --- |
| Ligar/desligar a esteira | Painel, toggle **Réplica ligada** → `replica_config.ativo` |
| Teto por hora (padrão 40) | Painel → Configurações → `replica_config.teto_hora` |
| Delay antes de publicar (padrão 8 s) | `replica_config.delay_segundos` |
| Apelido e etiqueta de afiliado | `replica_config.afiliado_matt_word` / `afiliado_matt_tool` |
| Atraso máximo da mensagem | `replica_config.atraso_maximo_segundos` (padrão 600 s) — post mais velho que isso não sai |
| Canal Telegram | Conexões do painel → `replica_config.destino_telegram` |

O painel só grava chave da lista branca do node `Normalizar Config`.

---

## Contrato (como o Connect Afiliado)

Cópia **idêntica** do que o grupo origem postou. A **única** alteração é o link de
afiliado do Mercado Livre (`matt_word` / `matt_tool`). Texto, emoji, foto, cupom,
aviso e “kkk” saem iguais. Sem `formato_post`, sem card canvas.

| # | Regra | Onde |
| --- | --- | --- |
| 1 | Só mensagem de **grupo** (`@g.us`), evento `messages_upsert` | `Normalizar Mensagem` |
| 2 | `fromMe` na **origem** copia; se o chat for **destino** WhatsApp, bloqueia loop | `origem_e_destino` |
| 3 | Sem texto e sem foto (sticker, reação) → `sem_texto` | `Normalizar Mensagem` |
| 4 | Atraso maior que `atraso_maximo_segundos` (padrão 600 s) não sai | `Debug Rota` / `no_prazo` |
| 5 | Só origem salva e rota **ATIVA**; esteira desliga em `replica_config.ativo` | painel |
| 6 | **Teto por hora**, padrão 40 — freio anti-flood | `replica_config.teto_hora` |
| 7 | Sem link ML: **copia igual** (texto, cupom, aviso, foto) | `Montar Post` |
| 8 | Com link ML: troca **só** o link; resto igual | `Montar Post` |
| 9 | Outro marketplace (Amazon, Shopee…): copia o post, não descarta | `Montar Post` |
| 10 | Foto da **origem**, inteira — não o card 1080×1144 | [Decisão 54](historico-de-decisoes.md#decisão-54--foto-inteira-2x-no-destino-card-desviado) |
| 11 | Dedup por `chat_id` + `message_id` (a mesma mensagem duas vezes some; reenvio novo sai) | `hash_conteudo` |

Quando o teto bate, a mensagem vira `ignorado` e **não volta depois**.

A réplica **não reconfere preço**. Se a origem mentiu, o canal repete.

---

## Link de afiliado

Formato:

```
{permalink sem parâmetros}?matt_word=caed1312314&matt_tool=96097202&forceInApp=true
```

| Parâmetro | Valor | O que é |
| --- | --- | --- |
| `matt_word` | `caed1312314` | Apelido da conta de afiliado |
| `matt_tool` | `96097202` | ID da etiqueta no painel de afiliados |
| `forceInApp` | `true` | Abre no app do ML |

Na réplica esses dois IDs vêm de `replica_config`, não de constante no Code node.

**Cupom sem produto** não reaproveita `/social/` de terceiro: aponta para a vitrine do
Eduardo (`/social/caed1312314?matt_word=…&matt_tool=…`). [Decisão 49](historico-de-decisoes.md#decisão-49--cupom-sem-produto-vai-para-a-vitrine-do-eduardo-nunca-para-social-de-terceiro).

Vitrine `meli.la` `/social/`: o MLB **não** vem na URL. Produto e foto saem do HTML
(`og:title`, `og:image`, `/up/MLBU`). **Não** pegar o primeiro `/p/MLB`.
[Decisão 52](historico-de-decisoes.md#decisão-52--produto-da-vitrine-social-sai-do-html-não-do-primeiro-pmlb).

---

## Preço no WhatsApp

No caption do `sendMedia`, o preço vai `R$ 150,00` com ZWSP depois do `$`, para o
celular não virar cashtag verde. Telegram não precisa disso.
[Decisão 56](historico-de-decisoes.md#decisão-56--preço-do-whatsapp-sem-cashtag).
