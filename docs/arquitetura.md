# Arquitetura — réplica de WhatsApp

Uma frase: a Evolution lê o grupo; o Ingest troca o link de afiliado e publica no
Telegram e no WhatsApp de destino; o painel é o cockpit.

---

## 1. As peças

| Peça | O que é | Detalhe |
| --- | --- | --- |
| **VPS Hostinger** | Servidor | `srv1897392.hstgr.cloud` |
| **n8n** | Automação, Docker | <https://srv1897392.hstgr.cloud> |
| **PostgreSQL 16** | Banco `pokemon_promos`, usuário `pokemon_bot` | Container `pokemon-postgres`. Porta 5432 só em `127.0.0.1` |
| **Rede `n8n_default`** | n8n, Postgres e Evolution se falam aqui | Se o n8n for redeployado, o Postgres precisa religar na rede nova ([P5](troubleshooting.md#p5--credencial-do-banco-para-de-conectar-couldnt-connect-with-these-settings)) |
| **Bot do Telegram** | Publica no canal | `@promopokemontcg`, id `-1004430553765` |
| **Evolution API** | Ponte WhatsApp (Baileys) | Projeto Docker `evolution-api`, imagem `evoapicloud/evolution-api`. Compose em [`deploy/evolution-api/`](../deploy/evolution-api/). Porta 8080 só em `127.0.0.1`; o n8n alcança `http://evolution-api:8080` |

### Credenciais (nomes e IDs, nunca valores)

| Credencial | ID | Usada por |
| --- | --- | --- |
| Pokemon Promos DB | `6jdqiaTfNIJseSqb` | Nodes de banco da réplica |
| Pokemon Telegram Bot | `jhasZWps6SfFVWaF` | `sendPhoto` / texto no canal |
| Painel Replica (Basic Auth) | `rjHWJIwMLcjCEpBl` | GET do painel e da página do QR |
| Evolution API Key (Header Auth) | `RqVdkbWZmwbs8ZsY` | HTTP da Evolution. Header `apikey` |

---

## 2. Diagrama

```
WhatsApp (grupos de origem)
        │
        ▼
Evolution API (Docker, sem porta pública)
        │  webhook messages.upsert
        ▼
Replica WhatsApp Ingest ──► Postgres (replica_rotas, replica_config, replica_log, …)
        │                            ▲
        │                            │ origens, destinos, ajustes
        │                     Replica Painel (Basic Auth)
        ▼
Telegram @promopokemontcg  +  (opcional) grupo WhatsApp de destino
```

O `Replica Nomes Sync` roda a cada 10 min e grava títulos em `replica_rotas`. O GET do
painel **não** chama `fetchAllGroups` — só lê o cache.

---

## 3. O que o Ingest faz, na ordem

1. **Webhook Evolution** — caminho com segredo. Caminho adivinhável = qualquer um publica no canal.
2. **Normalizar Mensagem** — só grupo, não é a própria conta, tem texto, atraso < 10 min.
3. **Consultar Rota e Config** — origem liberada? teto da hora? destinos? loop origem=destino?
4. **Extrair Links** + **Seguir Redirecionamento** — no máximo 4 encurtadores, dois saltos.
5. **Montar Post** — link do ML vira `?matt_word=…&matt_tool=…&forceInApp=true`; apaga convite de terceiro e marca (`@rasgabooster.tcg`, `#rasgaboot`, `frases_remover`). Vitrine `meli.la` `/social/`: produto sai do HTML (`og:title`, `og:image`), **não** do primeiro `/p/MLB`.
6. **Registrar e Deduplicar** — `INSERT ON CONFLICT (hash_conteudo) DO NOTHING`. Sem linha, não publica.
7. **Delay** — segundos de `replica_config`.
8. **Telegram** — foto inteira 2X + legenda limpa, sem `parse_mode`. Card 1080×1144 fica **desviado**.
9. **WhatsApp de destino** — a mesma foto via `sendMedia`, ou texto se não houver foto.
10. **Marcar Como Enviado**.

---

## 4. O painel

| Rota | Método | Auth | O que faz |
| --- | --- | --- | --- |
| `/webhook/replica/painel` | GET | Basic Auth | Devolve a página |
| `/webhook/replica/painel/salvar` | POST | token no JSON | Cria/edita rota, ou reconfigura Telegram |
| `/webhook/replica/painel/rota` | POST | token no JSON | Liga/desliga ou exclui rota |
| `/webhook/replica/painel/config` | POST | token no JSON | Ajuste em `replica_config` (lista branca) |

A página sai de `replica_config.pagina_gz` (base64 UTF-8 do HTML; o nome `_gz` é legado).
Fonte: [`backups/2026-08-28/painel/replica-painel.html`](../backups/2026-08-28/painel/replica-painel.html).
**Um escritor só** na coluna. HTML sem `"` nem `\`. Front monta a tela pela DOM API
(texto de terceiro não vai para `innerHTML`).

---

## 5. Onde o estado vive

Nada importante mora no workflow. Se o n8n reiniciar, a réplica continua.

| Pergunta | Quem responde |
| --- | --- |
| Este grupo está liberado? | `replica_transmissoes` + origens, ou legado `replica_rotas.ativa` |
| A esteira está ligada? | `replica_config.ativo` |
| Esta promoção já saiu? | `replica_log.hash_conteudo` |
| Quantos posts na última hora? | `replica_log.enviado_em` |
| Por que não saiu? | `replica_log.status` + `motivo` |
