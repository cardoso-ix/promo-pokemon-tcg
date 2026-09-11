# Banco de Dados — SQLite Embarcado

O sistema utiliza o **SQLite 3** por meio do driver de alta performance `better-sqlite3`. Ele opera em modo WAL (*Write-Ahead Logging*), garantindo máxima velocidade de leitura e escrita com consistência transacional e sem a necessidade de gerenciar servidores de banco de dados externos.

---

## 1. Localização e Persistência

| Ambiente | Caminho do Arquivo | Detalhe de Persistência |
| --- | --- | --- |
| **Nuvem (Railway / Render)** | `/app/data/replica.db` | Montado no Volume Persistente `/app/data` (salvo permanentemente) |
| **Local (Windows / Linux)** | `data/replica.db` | Salvo na pasta local do projeto (ignorado pelo Git) |

---

## 2. Esquema das Tabelas

### 2.1. `configs`
Armazena configurações globais de operação no modelo Chave-Valor.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `chave` | `TEXT PRIMARY KEY` | Nome do parâmetro |
| `valor` | `TEXT NOT NULL` | Valor da configuração |

**Chaves semeadas por padrão:**
- `ativo`: `'true'` ou `'false'` (liga/desliga geral da esteira).
- `delay_segundos`: Tempo de espera antes de postar no destino (padrão: `8`).
- `teto_hora`: Limite máximo de posts replicados por hora (padrão: `40`).
- `atraso_maximo_segundos`: Descarta mensagens com atraso superior a este valor (padrão: `600`).
- `affiliate_matt_word`: Parâmetro de apelido do afiliado ML (ex: `caed1312314`).
- `affiliate_matt_tool`: ID da etiqueta de afiliados ML (ex: `96097202`).
- `meli_cookie`: Cookie de sessão de afiliado para encurtar links com `https://meli.la/`.
- `meli_tag`: Tag de afiliado associada ao encurtamento.
- `frases_remover`: Lista de termos/assinaturas de concorrentes a remover (uma por linha).

---

### 2.2. `rotas`
Cadastro das rotas de replicação criadas pelo operador.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador único da rota |
| `nome` | `TEXT NOT NULL` | Rótulo amigável (ex: "Promoções Principais") |
| `ativa` | `INTEGER NOT NULL DEFAULT 1` | `1` se a rota estiver ativa, `0` se pausada |
| `criada_em` | `DATETIME` | Data e hora de criação |

---

### 2.3. `rota_origens`
Associação de grupos de WhatsApp de **origem** vinculados a uma rota.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `rota_id` | `INTEGER NOT NULL` | Chave estrangeira para `rotas(id)` |
| `chat_id` | `TEXT NOT NULL` | JID do WhatsApp (ex: `120363048912345678@g.us`) |

---

### 2.4. `rota_destinos`
Associação de grupos de WhatsApp de **destino** vinculados a uma rota.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `rota_id` | `INTEGER NOT NULL` | Chave estrangeira para `rotas(id)` |
| `chat_id` | `TEXT NOT NULL` | JID do WhatsApp de destino |

---

### 2.5. `logs`
Diário de bordo de todas as mensagens capturadas, status de envio e desduplicação.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | ID do registro |
| `origem_chat_id` | `TEXT` | JID do grupo de onde a mensagem veio |
| `origem_nome` | `TEXT` | Nome amigável do grupo de origem |
| `destino_chat_id` | `TEXT` | JID do grupo para onde a mensagem foi enviada |
| `hash_conteudo` | `TEXT UNIQUE` | Hash SHA-256 do conteúdo para evitar duplicações |
| `texto_original` | `TEXT` | Texto original recebido do WhatsApp |
| `texto_publicado` | `TEXT` | Texto processado com links convertidos |
| `tem_foto` | `INTEGER DEFAULT 0` | `1` se continha foto, `0` se apenas texto |
| `links_convertidos`| `INTEGER DEFAULT 0` | Quantidade de links ML convertidos |
| `status` | `TEXT NOT NULL` | `enviado`, `ignorado`, `erro` |
| `motivo` | `TEXT` | Motivo de descarte ou mensagem de erro |
| `criado_em` | `DATETIME` | Horário de registro |

---

### 2.6. `chats_cache`
Cache dos grupos de WhatsApp em que a conta conectada participa.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `chat_id` | `TEXT PRIMARY KEY` | JID do chat no WhatsApp |
| `nome` | `TEXT NOT NULL` | Nome legível do grupo ou contato |
| `is_group` | `INTEGER DEFAULT 1` | `1` para grupos, `0` para chats individuais |
| `atualizado_em` | `DATETIME` | Última sincronização pelo Baileys |

---

## 3. Consultas Úteis para Monitoramento

Para consultar o banco localmente:
```bash
# Abrir o sqlite via terminal
sqlite3 data/replica.db
```

### Ver últimas 10 postagens replicadas com sucesso:
```sql
SELECT id, criado_em, origem_nome, links_convertidos, tem_foto, status 
FROM logs 
WHERE status = 'enviado' 
ORDER BY id DESC LIMIT 10;
```

### Ver total de mensagens enviadas hoje:
```sql
SELECT count(*) as total_hoje 
FROM logs 
WHERE status = 'enviado' 
  AND date(criado_em) = date('now');
```

### Ver todas as rotas ativas com suas origens e destinos:
```sql
SELECT r.id, r.nome, r.ativa, o.chat_id AS origem, d.chat_id AS destino
FROM rotas r
LEFT JOIN rota_origens o ON r.id = o.rota_id
LEFT JOIN rota_destinos d ON r.id = d.rota_id;
```
