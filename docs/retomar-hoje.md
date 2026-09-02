# Retomar hoje (02/09/2026, noite)

Abra **este arquivo primeiro** se você (ou um agente) estiver em outra máquina.
O n8n na VPS é a fonte da verdade. Git documenta, guarda backup e os scripts de publicação.

Conferência ao vivo neste horário: réplica **no ar**; bot de curadoria **desligado**.

---

## 1. Links

| O quê | Onde |
| --- | --- |
| Chat deste agente Cursor | https://cursor.com/agents/bc-84ff2949-f996-4921-8720-166bc249d52e |
| Código (branch) | `cursor/replica-foto-ml-d52e` — sempre `git pull origin cursor/replica-foto-ml-d52e` |
| Zip da branch | https://github.com/cardoso-ix/promo-pokemon-tcg/archive/refs/heads/cursor/replica-foto-ml-d52e.zip |
| Pull request | https://github.com/cardoso-ix/promo-pokemon-tcg/pull/2 |
| n8n | https://srv1897392.hstgr.cloud |
| Painel da réplica | https://srv1897392.hstgr.cloud/webhook/replica/entrar |
| Canal | https://t.me/promopokemontcg |

Não cole senha, `N8N_API_KEY` nem token de save neste arquivo. No Cursor da outra máquina, a chave da API do n8n precisa estar nas Secrets (header `X-N8N-API-KEY`) se for republicar HTML ou Code node.

---

## 2. Como pegar o código

```bash
git clone https://github.com/cardoso-ix/promo-pokemon-tcg.git
cd promo-pokemon-tcg
git fetch origin cursor/replica-foto-ml-d52e
git checkout cursor/replica-foto-ml-d52e
git pull origin cursor/replica-foto-ml-d52e
```

Já tem o repo: só o `fetch` + `checkout` + `pull` da branch. **Não** restaure `backups/2026-08-13/` em cima do n8n — volta ritmo, teto e filtro velhos.

---

## 3. O que está no ar agora (n8n)

`versionId` tem que ser igual a `activeVersionId`. Salvar ≠ publicar ([P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

| Workflow | ID | Estado vivo (02/09 noite) |
| --- | --- | --- |
| `Replica WhatsApp Ingest` | `4mE343XrNXgIwAIF` | **Ativo** `70be8ff6` — foto do polycard, nome na legenda, **só Mercado Livre** |
| `Replica Painel` | `lWDnggRX8xQmYyQV` | **Ativo** `4a6a1223` — Config editável + plataformas; HTML `pagina_gz` 70760 bytes |
| `Replica Nomes Sync` | `J6zU6p48OEBO0raf` | **Ativo** `c36c3821` |
| `Replica WhatsApp Conectar` | `v32gcVzRkedUACXD` | **Ativo** `5ce7ba5a` — QR |
| `Pokemon Store Scanner` | `PNwaF3BYhj5KA8eY` | **Inativo** — não está postando da vitrine |
| `Pokemon Publisher v2` | `FXNWeT9C7dEA0DUY` | **Inativo** — canal de curadoria parado |
| `Pokemon Scanner v2` | `39kdRchYI6CwsbNY` | **Inativo** |
| `Pokemon Health Alert` | `3irgeWFKZGZZrJ5u` | **Inativo** |
| `Pokemon Catalog Scanner` | `2ckVyvFPvtqwECDI` | Arquivado. **Não publicar** |

**Não religue a curadoria** sem o Eduardo pedir: mistura posts filtrados com a réplica no mesmo canal. A réplica sozinha já alimenta o [@promopokemontcg](https://t.me/promopokemontcg).

---

## 4. O que esta branch já fez (não refazer)

1. Foto oficial do anúncio via polycard do `meli.la` — não usar `og:image` de `/social/` nem a PDP `/p/` (anti-bot na VPS). [Decisão 52](historico-de-decisoes.md#decisão-52--foto-oficial-do-anúncio-mesmo-quando-a-origem-veio-só-com-texto).
2. Nome do produto injetado na legenda quando a origem só manda preço/cupom.
3. Painel grava a lista branca pela aba Configurações. Visual: `python3 tools/publicar-painel.py`. Login em `replica-login.html`. [Decisão 53](historico-de-decisoes.md#decisão-53--o-painel-grava-os-ajustes-da-lista-branca-e-o-html-sobe-por-script).
4. **Só Mercado Livre** replica. Amazon/Shopee/Magalu aparecem desligadas no site. Oferta só de `amzn.to` → `descartado` / `plataforma_nao_selecionada`. [Decisão 54](historico-de-decisoes.md#decisão-54--só-replicar-marketplace-com-afiliação).

Replay da mesma mensagem de WhatsApp **não** republica (hash `chat_id|message_id`). Teste de foto, título ou Amazon vale só em **mensagem nova**.

---

## 5. Como mexer daqui pra frente

**Ajuste do dia a dia (sem n8n):**  
https://srv1897392.hstgr.cloud/webhook/replica/entrar → Configurações. Teto, delay, afiliado, JSON do post, plataformas. Ctrl+F5 se a página parecer cortada.

**Visual do painel:**

```bash
# HTML sem aspas duplas nem barra invertida
python3 tools/publicar-painel.py          # pagina_gz
python3 tools/publicar-painel.py --login  # tela /entrar
```

**Ingest (Code node / SQL):**

```bash
python3 tools/publicar-ingest-n8n.py
```

PUT do n8n: em `settings` só `executionOrder` / `availableInMCP` / `timezone`. `binaryMode` dá 400. Depois do PUT, `/activate`. Confira `versionId` = `activeVersionId`.

Arquivos:

- Painel HTML: `backups/2026-08-28/painel/replica-painel.html`
- Login: `backups/2026-08-28/painel/replica-login.html`
- Ingest `Montar Post`: `backups/2026-09-02/code-nodes/replica-ingest--montar-post.js`
- Ingest SQL: `backups/2026-09-02/sql/replica-ingest--consultar-rota-e-config.sql`

O gerador `tools/gerar-painel-code-node.mjs` é paraquedas se a Decisão 51 for revertida. Não é o caminho do dia a dia.

---

## 6. O que falta (não é bug)

| Item | Nota |
| --- | --- |
| Validar Amazon numa mensagem **nova** | Atividades deve mostrar `plataforma_nao_selecionada` |
| Painel: Ctrl+F5 | Cache velho mostra JS cortado ([P20](troubleshooting.md#p20--o-painel-da-réplica-abre-mas-nada-funciona)) |
| Dashboard único curadoria + réplica | [roadmap](roadmap.md#dashboard) — Fase 1 ainda não começou |
| Religar Store Scanner / Publisher | Só se o Eduardo quiser de novo posts de curadoria no canal |
| Mergear o PR #2 | Só com pedido explícito; hoje está em draft |
| Afiliação Amazon | Não ligar o quadrado até existir conversor |

---

## 7. Leitura na ordem

1. Este arquivo
2. [estado-atual.md](estado-atual.md) — versões e o que já foi investigado
3. [runbook.md](runbook.md) seção 15 — operação da réplica
4. [arquitetura.md](arquitetura.md) — só se precisar do desenho das esteiras

Regra: se git e n8n divergirem, **o n8n está certo**. Corrija a documentação.
