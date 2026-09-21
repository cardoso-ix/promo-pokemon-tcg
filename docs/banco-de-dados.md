# Banco de Dados — SQLite Embarcado (WAL Mode)

O sistema utiliza o **SQLite 3** por meio do driver de alta performance `better-sqlite3`. Ele opera em modo WAL (*Write-Ahead Logging*), garantindo máxima velocidade de leitura e escrita com consistência transacional e sem a necessidade de gerenciar servidores de banco de dados externos.

---

## 1. Localização e Persistência dos Bancos

A plataforma opera com dois bancos de dados independentes, salvos no volume persistente NVMe de cada contêiner no Railway:

| Aplicação | Arquivo do Banco | Localização na Nuvem | Detalhe de Persistência |
| --- | --- | --- | --- |
| **Replicador de Ofertas** | `replica.db` | `/app/data/replica.db` | Montado no volume `/app/data` do serviço replicador |
| **Bot Disparador & IA** | `disparador.db` | `/app/data/disparador.db` | Montado no volume `/app/data` do serviço disparador |

---

## 2. Esquema do Banco do Replicador (`replica.db`)

### 2.1. `configs`
Armazena parâmetros operacionais no modelo Chave-Valor:
- `ativo`: Flag global de replicação (`true`/`false`).
- `delay_segundos`: Intervalo mínimo entre despachos (pacing de 8-10s).
- `teto_hora`: Limite máximo de mensagens enviadas por hora.
- `affiliate_matt_word`: Identificador de afiliado Mercado Livre (`matt_word`).
- `meli_cookie`: Sessão autenticada no Mercado Livre para resolução de URLs `meli.la`.
- `template_modo`: Modo de formatação de mensagens (`padrao`, `urgencia`, `cupom`, `original`).
- `cooldown_duplicidade_minutos`: Janela de desduplicação cross-group canônica (padrão 5 min).
- `filtro_apenas_tcg`: Guardião de nicho TCG (`true`/`false`).

### 2.2. `rotas`
Cadastro das rotas de replicação de ofertas criadas pelo operador (`id`, `nome`, `ativa`, `criada_em`).

### 2.3. `rota_origens` e `rota_destinos`
Associa os grupos de origem monitorados e os grupos de destino receptores para cada rota.

### 2.4. `produtos_replicados`
Tabela da **Opção C (Desduplicação Global Cross-Group por Produto Canônico)**:
- `canonical_id` (TEXT): ID canônico extraído da URL do Mercado Livre (ex: `MLB5424578130`).
- `titulo` (TEXT): Título do produto replicado.
- `preco_por` (REAL): Preço promocional registrado no último envio.
- `grupo_origem_jid` (TEXT): Grupo de onde a oferta foi capturada.
- `enviado_em` (TEXT): Timestamp ISO da última replicação.
- *Índice*: `idx_prod_rec (canonical_id, enviado_em DESC)` para consultas ultra-rápidas.
- *Regra de Exceção*: Quedas de preço superiores a 5% quebram o cooldown automaticamente para entregar o melhor valor.

### 2.5. `logs`
Diário de bordo de todas as mensagens tratadas, contendo hash SHA-256 para desduplicação, status (`enviado`, `ignorado`, `descartado`, `erro`), links convertidos e se continha mídia.

### 2.6. `chats_cache`
Cache dos grupos de WhatsApp em que o chip do replicador participa.

---

## 3. Esquema do Banco do Bot Disparador (`disparador.db`)

### 3.1. `configuracoes`
Armazena parâmetros do disparador, regras anti-ban e credenciais da IA DeepSeek:
- `deepseek_api_key`: Chave do gateway OpenCode.
- `deepseek_base_url`: `https://opencode.ai/zen/go/v1`.
- `deepseek_model`: `deepseek-v4-flash` / `deepseek-v4-pro`.
- `deepseek_prompt_sistema`: Personalidade do assistente especialista em Pokémon TCG.
- `disparo_delay_min` / `disparo_delay_max`: Delays humanizados entre mensagens (ex: 35s a 70s).
- `disparo_pausa_a_cada` / `disparo_pausa_tempo_minutos`: Pausas de segurança anti-ban.
- `disparo_horario_inicio` / `disparo_horario_fim`: Janela de envio.
- `disparo_limite_diario`: Cota segura diária (ex: 50 envios no 1º dia).

### 3.2. `contatos`
Base de leads extraídos de grupos ou importados manualmente:
- `jid` (TEXT UNIQUE): Identificador WhatsApp (ex: `5511999999999@s.whatsapp.net`).
- `numero`, `nome`, `origem_grupo`, `grupo_nome`, `origem_tipo`, `ativo`.

### 3.3. `grupos`
Cache dos grupos dos quais o chip do disparador participa:
- `jid` (TEXT UNIQUE), `nome`, `total_membros`, `foto_url`, `sincronizado_em`.

### 3.4. `campanhas`
Campanhas de disparo em massa criadas:
- `id`, `nome`, `mensagem_template`, `midia_tipo`, `midia_url`, `status` (`criada`, `executando`, `pausada`, `concluida`), `total_destinatarios`, `enviados`, `falhas`.

### 3.5. `fila_envios`
Fila ordenada de mensagens a enviar:
- `campanha_id` (FK), `destinatario_jid`, `destinatario_nome`, `mensagem_gerada` (já processada com Spintax único), `status` (`pendente`, `enviando`, `enviado`, `falha`), `erro`, `enviado_em`.

### 3.6. `historico_ia`
Histórico de atendimento humanizado no privado:
- `chat_jid`, `remetente` (`lead` ou `bot`), `mensagem`, `criado_em`.

### 3.7. `logs_sistema`
Auditoria de eventos do disparador, categorizados por `info`, `warn`, `error`, `ia` e `disparo`.
