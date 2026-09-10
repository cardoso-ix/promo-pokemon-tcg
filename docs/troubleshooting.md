# Troubleshooting — réplica

Sintoma → causa → solução. Casos que **já aconteceram** neste projeto.

| O que você observa | Vá para |
| --- | --- |
| Canal quieto, réplica ligada | [P1](#p1--a-réplica-não-está-publicando) |
| Credencial do banco não conecta | [P5](#p5--credencial-do-banco-para-de-conectar) |
| Workflows sumiram do n8n | [P6](#p6--os-workflows-desapareceram-do-n8n) |
| Node vermelho de credencial | [P7](#p7--node-vermelho-reclamando-de-credencial) |
| `access to env vars denied` | [P10](#p10--access-to-env-vars-denied) |
| Mexi no workflow e quebrou | [P14](#p14--mexi-no-workflow-e-quebrou) |
| `.md` ilegível / espaços entre letras | [P17](#p17--documento-ilegível-salvo-em-utf-16-pelo-powershell) |
| Salvei e a produção continua antiga | [P18](#p18--salvar-não-é-publicar) |
| Painel abre mas nada funciona | [P20](#p20--o-painel-da-réplica-abre-mas-nada-funciona) |
| Ingest com SyntaxError, canal mudo | [P21](#p21--a-réplica-está-muda-syntaxerror-em-metadohtml) |
| Post com produto errado (Mewtwo / outro `/p/MLB`) | [P22](#p22--vitrine-social-publicou-o-mlb-errado) |
| Foto “cortada” ou saiu o card | [P23](#p23--a-foto-saiu-cortada-era-o-card-não-a-foto-nua) |

---

## P1 — A réplica não está publicando

**Sintoma:** o canal não recebe post novo.

Cheque nesta ordem:

1. No painel, **Réplica ligada** está on? `replica_config.ativo` precisa ser `true`.
2. A rota tem **ATIVA** e uma origem + um destino?
3. O WhatsApp está pareado? Página do QR.
4. A origem mandou **texto ou foto**? Sticker/reação sem caption ainda é `sem_texto`.
5. Bateu o teto da hora (`ignorado`)? Post mais velho que `atraso_maximo_segundos` (padrão 600 s) não sai.
6. O Ingest está **publicado** e ativo? (`versionId` = `activeVersionId`)
7. Olhe `replica_log` ([runbook, seção 5](runbook.md#5-conferir-se-está-funcionando)). Motivos novos: `copia_identica`, `copia_com_afiliado`, `copia_outro_marketplace`.

Silêncio **não** é pane se a origem está quieta, se o chat não é origem da rota, ou se o post é sticker/reação.

---

## P5 — Credencial do banco para de conectar

**Sintoma:** "Couldn't connect with these settings" na credencial Pokemon Promos DB.

**Causa que já aconteceu:** redeploy do n8n recria a rede `n8n_default`; o Postgres fica
na rede antiga. Restart simples **pode não** resolver — precisa recriar o projeto
`pokemon-postgres` com `networks: n8n_default` externa. Depois, **Retry** na credencial.

**Causa alternativa:** senha. Mensagem `password authentication failed`. O `$` do
`.env` foi comido pelo Compose. O banco aceita `PkmnPromos2026!Br`. Evite `$` em senha
nova, ou escape `$$`.

---

## P6 — Os workflows desapareceram do n8n

**Sintoma:** a lista do n8n está vazia depois de um redeploy.

**Causa:** volume Docker recriado. Já aconteceu.

**Prevenção:** antes de mexer no n8n na VPS, **Download** dos workflows da réplica.
O banco é outro container — os dados `replica_*` não somem junto.

---

## P7 — Node vermelho reclamando de credencial

Abra o node → **Credential to connect with**:

- Postgres → **Pokemon Promos DB**
- Telegram → **Pokemon Telegram Bot**
- HTTP da Evolution → **Evolution API Key**

Node criado por programa **não** herda credencial sozinho.

---

## P10 — `access to env vars denied`

Esta instalação tem `N8N_BLOCK_ENV_ACCESS_IN_NODE`. Não use `$env`. Valor no node
ou em `replica_config`. Não desligue a proteção — vale para o n8n inteiro.

---

## P14 — Mexi no workflow e quebrou

1. Exporte **Download** antes de editar.
2. Node novo sem credencial → [P7](#p7--node-vermelho-reclamando-de-credencial).
3. Expressão SQL no n8n precisa do prefixo `=`. Sem isso o banco grava o texto `{{ $json… }}`.
4. Rode na mão e **publique** ([P18](#p18--salvar-não-é-publicar)).

`validate_workflow` do MCP valida código do SDK, não o workflow que já está no n8n.

---

## P17 — Documento ilegível, salvo em UTF-16 pelo PowerShell

`Out-File` / `>` no PowerShell 5.1 grava UTF-16. Use `Set-Content -Encoding utf8` ou
grave pelo editor. Byte `00` a cada dois = UTF-16.

---

## P18 — Salvar não é publicar

| Versão | Campo | Quem usa |
| --- | --- | --- |
| A que você editou | `versionId` | editor e execução **manual** |
| A que está no ar | `activeVersionId` | agendador / webhook de produção |

**Publish** depois de cada mudança no Ingest ou no painel. Prova: execução real com o
node novo no caminho.

---

## P20 — O painel da réplica abre, mas nada funciona

**Sintoma:** página pinta, botões mortos. Fonte acaba no meio de um `<script>`.

**Causa:** `pagina_gz` pela metade (já aconteceu duas vezes: manhã de 29/08 e corrida
de writers). Ou cache do Chrome.

**Solução:** `length(pagina_gz)` = **71364**, MD5 `adf87ccf658e4b089798562cb99255f6`.
Se estiver curto, regrave o base64 do HTML local com **um escritor só**. **Ctrl+F5**.
Sem Basic Auth o n8n diz “Authorization is required!” — isso é o GET, não o HTML.

---

## P21 — A réplica está muda: SyntaxError em `metaDoHtml`

**Sintoma:** Ingest dispara, destino não recebe. `SyntaxError` no Code node.

**Causa:** regex com `["\\']` na versão `9d039042` (29/08).

**Solução:** já publicado com `String.fromCharCode`. Se voltar: patch + **Publish**.
Não mexa em workflow arquivado da curadoria para “consertar” a réplica.

---

## P22 — Vitrine `/social/` publicou o MLB errado

`meli.la` de `/social/` **não traz o MLB na URL**. O primeiro `/p/MLB` do HTML é item
relacionado (caso real: Mewtwo `MLB52935542`).

Produto: `og:title`, `og:image`, `/up/MLBU` no HTML. [Decisão 52](historico-de-decisoes.md#decisão-52--produto-da-vitrine-social-sai-do-html-não-do-primeiro-pmlb).

---

## P23 — A foto saiu “cortada”: era o card, não a foto nua

O destino mostrou o retângulo 1080×1144. Causa: ingest mandou o **card canvas**.
Publicado: foto inteira 2X via `og:image`; card desviado.
[Decisão 54](historico-de-decisoes.md#decisão-54--foto-inteira-2x-no-destino-card-desviado).
Post antigo não foi republicado.
