# Runbook — réplica

O manual do dia a dia. Consultas 🟢 só leem. Consultas 🟡 alteram dados.

**Índice**

1. [Ligar e desligar](#1-ligar-e-desligar)
2. [Como rodar uma consulta SQL](#2-como-rodar-uma-consulta-sql)
3. [Evolution, QR e credenciais](#3-evolution-qr-e-credenciais)
4. [Painel: rotas e destinos](#4-painel-rotas-e-destinos)
5. [Conferir se está funcionando](#5-conferir-se-está-funcionando)
6. [Mexer no HTML do painel](#6-mexer-no-html-do-painel)
7. [Salvar não é publicar](#7-salvar-não-é-publicar)
8. [Rodar um workflow na mão](#8-rodar-um-workflow-na-mão)

---

## 1. Ligar e desligar

Três níveis, do mais brando ao mais bruto:

| Quero | Faça |
| --- | --- |
| Parar um grupo | Tire-o da rota (Editar) ou desligue **ATIVA** no card |
| Parar a esteira, painel no ar | Toggle **Réplica ligada** no topo → `replica_config.ativo = false` |
| Parar de verdade | Despublique o `Replica WhatsApp Ingest` no n8n |

Não existe mais bot de curadoria para “não afetar”. O canal só recebe o que a réplica mandar.

---

## 2. Como rodar uma consulta SQL

Você não precisa de cliente Postgres. No n8n:

1. Crie um workflow descartável (nome começando com `TMP`).
2. Um node **Postgres** → credencial **Pokemon Promos DB**.
3. Cole o SQL, execute, leia o resultado, **arquive** o TMP.

Cuidado: o node executa o que você colar, inclusive `DELETE`. Use só o SQL deste runbook
até entender o comando.

---

## 3. Evolution, QR e credenciais

A Evolution roda como projeto Docker `evolution-api` (`/docker/evolution-api/`).
Compose em [`deploy/evolution-api/`](../deploy/evolution-api/).

- Imagem: **`evoapicloud/evolution-api`**, não `atendai` (essa não sobe nesta VPS).
- Sem porta pública: `127.0.0.1:8080`. O n8n fala `http://evolution-api:8080`.
- Webhook aponta para `http://n8n:5678/...`, **não** para o domínio público (de dentro do container o domínio resolve para `127.0.1.1`).
- Recriar o container **não** desconecta o WhatsApp (sessão no banco + volume `evolution_instances`). QR novo só se apagar o volume.
- Senha do Postgres: o `.env` mente. O banco aceita **`PkmnPromos2026!Br`**.

### Credenciais no n8n

| Credencial | Tipo | Onde |
| --- | --- | --- |
| `Painel Replica` | Basic Auth | GET do painel e do QR |
| `Evolution API Key` | Header Auth, Name `apikey` | HTTP da Evolution. **Não** use `getMedia` para foto do produto (400); a foto vem de `og:image` |

### Conectar o WhatsApp

1. Abra <https://srv1897392.hstgr.cloud/webhook/replica/conectar> (Basic Auth).
2. A página pede o QR e recarrega a cada 25 s.
3. No celular: **WhatsApp → Aparelhos conectados → Conectar aparelho**.
4. Depois, **entre nos grupos com esse número**. A Evolution só vê grupo do qual o chip participa.

---

## 4. Painel: rotas e destinos

URL: <https://srv1897392.hstgr.cloud/webhook/replica/entrar> — tela CRT. Mesmo usuário e senha de sempre. A URL antiga `/webhook/replica/painel` ainda existe (popup do browser); use `/entrar`.

Abas: **Visão Geral**, **Conexões**, **Rotas**, **Configurações**, **Atividades**.
Grupos aparecem pelo **nome**, não pelo JID.

1. **Conexões** — QR se o WA cair. Telegram é o `@promopokemontcg` cadastrado (não é OAuth). **Reconfigurar** troca o `@`. **Desconectar** tira o canal das rotas.
2. **Rotas** — **+ Nova Rota**: nome, origens WA, destinos TG/WA. Combo com **Pesquisar grupos…**. Enter escolhe o primeiro; Escape fecha. **Salvar Alterações**. Se pedir senha, é a do painel, não a do Connect Afiliado. O POST usa token de save ([Decisão 47](historico-de-decisoes.md#decisão-47--token-de-save-no-json-porque-o-chrome-não-reenvia-basic-auth-no-fetch)).
3. Card da rota: **ATIVA**, **Editar**, **Excluir**.
4. Comece com **uma origem**. Olhe Atividades antes da segunda.

**Não use o mesmo grupo como origem e destino.**

O destino recebe a **foto inteira** 2X, não o card.
[Decisão 54](historico-de-decisoes.md#decisão-54--foto-inteira-2x-no-destino-card-desviado).
Vitrine `/social/`: produto no HTML, nunca o primeiro `/p/MLB`
([Decisão 52](historico-de-decisoes.md#decisão-52--produto-da-vitrine-social-sai-do-html-não-do-primeiro-pmlb)).

---

## 5. Conferir se está funcionando

🟢 Últimas 30 mensagens:

```sql
SELECT to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS quando,
       COALESCE(origem_nome, origem_chat_id) AS origem,
       status,
       motivo,
       links_convertidos,
       LEFT(texto_publicado, 80) AS trecho
  FROM replica_log
 ORDER BY id DESC
 LIMIT 30;
```

🟢 Resumo das últimas 24h:

```sql
SELECT status,
       COALESCE(motivo, '(sem motivo)') AS motivo,
       COUNT(*) AS quantas
  FROM replica_log
 WHERE criado_em > NOW() - INTERVAL '24 hours'
 GROUP BY status, motivo
 ORDER BY quantas DESC;
```

🟢 Grupos e rendimento:

```sql
SELECT chat_id, nome, ativa, mensagens_vistas, replicadas, ultima_mensagem
  FROM replica_rotas
 ORDER BY ativa DESC, ultima_mensagem DESC NULLS LAST;
```

Como ler: `mensagens_vistas` alto + `replicadas` zero — olhe `motivo` (`copia_identica` deve sair; `sem_texto` / `origem_e_destino` / teto ainda cortam).
= grupo que não serve. `status = 'erro'` = problema de publicação, não de origem.

---

## 6. Mexer no HTML do painel

Fonte: [`backups/2026-08-28/painel/replica-painel.html`](../backups/2026-08-28/painel/replica-painel.html).
Produção lê `replica_config.pagina_gz` (base64 UTF-8, não gzip). Completo: **71364** bytes,
MD5 `adf87ccf658e4b089798562cb99255f6`.

1. Edite o HTML **sem** aspas duplas nem barra invertida.
2. Grave o base64 com **um escritor só**.
3. **Ctrl+F5**. Cache velho mostra JS cortado ([P20](troubleshooting.md#p20--o-painel-da-réplica-abre-mas-nada-funciona)).

O gerador [`tools/gerar-painel-code-node.mjs`](../tools/gerar-painel-code-node.mjs) é
paraquedas (embeber HTML no Code node). Só use se reverter a Decisão 51.

---

## 7. Salvar não é publicar

A versão do editor (`versionId`) e a do ar (`activeVersionId`) são coisas diferentes.
Depois de mexer no Ingest ou no painel: **Publish**, depois confira uma execução
**agendada** (não a manual). [P18](troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada).

---

## 8. Rodar um workflow na mão

No n8n, abra o workflow e clique em **Execute workflow**. Serve para testar o Ingest com
`pinData` ou para ver o Nomes Sync sem esperar 10 min. Execução manual usa a versão
**salva**; o relógio usa a **publicada**.
