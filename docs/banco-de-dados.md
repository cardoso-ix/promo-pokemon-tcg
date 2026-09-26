# Banco de Dados — SQLite Embarcado (WAL Mode)

O sistema utiliza o **SQLite 3** por meio do driver de alta performance `better-sqlite3`. Ele opera em modo WAL (*Write-Ahead Logging*), garantindo máxima velocidade de leitura e escrita com consistência transacional e sem a necessidade de gerenciar servidores de banco de dados externos.

---

## 1. Localização e Persistência dos Bancos

A plataforma opera com dois bancos de dados independentes, salvos no volume persistente NVMe de cada contêiner na VPS HostGator gerenciada pelo Coolify:

| Aplicação | Arquivo do Banco | Localização na Nuvem | Detalhe de Persistência |
| :--- | :--- | :--- | :--- |
| **Replicador de Ofertas** | `replica.db` | `/app/data/replica.db` | Montado no volume persistente Docker `promo_replica_data` |
| **Bot Disparador & IA** | `disparador.db` | `/app/data/disparador.db` | Montado no volume persistente Docker `bot_disparador_data` |

Em ambiente de desenvolvimento local, os arquivos ficam salvos em:
- Replicador: `app/data/replica.db`
- Disparador: `bot-disparador/data/disparador.db`

---

## 2. Esquema do Banco do Replicador (`replica.db`)

### 2.1. `configs`
Armazena parâmetros operacionais no modelo Chave-Valor:
- `ativo`: Flag global de replicação (`true`/`false`).
- `delay_segundos`: Intervalo mínimo entre despachos (pacing de 8-10s).
- `teto_hora`: Limite máximo de mensagens enviadas por hora (padrão 40).
- `affiliate_matt_word`: Identificador de afiliado Mercado Livre (`matt_word`).
- `meli_cookie`: Sessão autenticada no Mercado Livre para resolução de URLs `meli.la`.
- `template_modo`: Modo de formatação de mensagens (`padrao`, `urgencia`, `cupom`, `original`).
- `cooldown_duplicidade_minutos`: Janela de desduplicação cross-group canônica (padrão 30 min).
- `filtro_apenas_tcg`: Guardião de nicho TCG (`true`/`false`).
- `replicar_comunicados_texto`: Replicar comunicados informativos e telas de cupom sem link (`true`/`false`).
- `msg_abertura_ativa`: Flag de ativação da mensagem diária das 07:00 AM.
- `msg_abertura_horario`: Horário programado de disparo diário (padrão `07:00`).
- `msg_abertura_modo`: Modo de seleção de mensagem (`ROTACAO_DIARIA`).

### 2.2. `rotas`
Cadastro das rotas de replicação de ofertas criadas pelo operador (`id`, `nome`, `ativa`, `criada_em`).

### 2.3. `rota_origens` e `rota_destinos`
Associa os grupos de origem monitorados e os grupos de destino receptores para cada rota.

### 2.4. `produtos_replicados`
Tabela da **Desduplicação Global Cross-Group por Produto Canônico**:
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
Cache dos grupos de WhatsApp em que o chip do replicador participa (`jid`, `nome`, `atualizado_em`).

---

## 3. Esquema do Banco do Bot Disparador (`disparador.db`)

### 3.1. `configuracoes`
Armazena parâmetros do disparador, regras anti-ban e credenciais da IA DeepSeek:
- `deepseek_api_key`: Chave do gateway OpenCode ou DeepSeek.
- `deepseek_base_url`: `https://opencode.ai/zen/go/v1`.
- `deepseek_model`: `deepseek-v4-flash` / `deepseek-v4-pro`.
- `deepseek_prompt_sistema`: Personalidade do assistente especialista em Pokémon TCG.
- `disparo_delay_min` / `disparo_delay_max`: Delays humanizados entre mensagens (ex: 35s a 70s).
- `disparo_pausa_a_cada` / `disparo_pausa_tempo_minutos`: Pausas de segurança anti-ban.
- `disparo_horario_inicio` / `disparo_horario_fim`: Janela de envio autorizada.
- `disparo_limite_diario`: Cota segura diária.
- `meta_access_token`, `meta_phone_number_id`, `meta_waba_id`: Credenciais Meta Cloud API.

### 3.2. `contatos`
Base de leads extraídos de grupos ou importados via planilha:
- `id`, `jid` (TEXT UNIQUE), `numero`, `nome`, `origem_grupo`, `grupo_nome`, `origem_tipo`, `ativo`, `criado_em`, `atualizado_em`.

### 3.3. `grupos`
Cache dos grupos dos quais o chip do disparador participa:
- `id`, `jid` (TEXT UNIQUE), `nome`, `total_membros`, `foto_url`, `sincronizado_em`.

### 3.4. `campanhas`
Campanhas de disparo em massa criadas:
- `id`, `nome`, `mensagem_template`, `midia_tipo`, `midia_url`, `midia_path`, `status` (`criada`, `executando`, `pausada`, `concluida`, `cancelada`), `total_destinatarios`, `enviados`, `falhas`, `criado_em`, `iniciado_em`, `concluido_em`, `canal_envio` (`baileys` ou `meta_cloud`), `meta_template_nome`.

### 3.5. `fila_envios`
Fila ordenada de mensagens a enviar com integridade referencial em cascata:
- `id`, `campanha_id` (FK), `destinatario_jid`, `destinatario_nome`, `mensagem_gerada`, `status` (`pendente`, `enviando`, `enviado`, `falha`), `erro`, `enviado_em`, `criado_em`.

### 3.6. `historico_ia`
Histórico de atendimento humanizado no privado:
- `id`, `chat_jid`, `remetente` (`lead` ou `bot`), `mensagem`, `criado_em`.

### 3.7. `logs_sistema`
Auditoria de eventos do disparador (`nivel`: `info`, `warn`, `error`, `ia`, `disparo`).

### 3.8. `meta_templates`
Modelos de mensagem aprovados oficialmente na Meta Cloud API:
- `id`, `meta_id` (TEXT UNIQUE), `nome`, `categoria` (`UTILITY`, `MARKETING`), `idioma`, `status` (`APPROVED`, `PENDING`, `REJECTED`, `PAUSED`), `motivo_rejeicao`, `corpo_texto`, `exemplo_variaveis`, `sincronizado_em`.

### 3.9. `ofertas_recebidas`
Fila de ofertas transmitidas pelo Replicador via ponte interna Docker:
- `id`, `titulo`, `link_afiliado`, `link_original`, `preco_de`, `preco_por`, `desconto`, `cupom`, `parcelamento`, `imagem_url`, `mensagem_formatada`, `origem`, `status` (`nova`, `usada`, `descartada`), `criado_em`.

### 3.10. `financas_uploads`
Histórico de arquivos de relatórios semanais do Meta Ads processados:
- `id`, `nome_arquivo`, `caminho_arquivo`, `tamanho_bytes`, `mes_referencia` (ex: `2026-09`), `semana_rotulo` (ex: `Semana 1`), `periodo_inicio`, `periodo_fim`, `total_linhas`, `valor_total_gasto`, `total_resultados`, `impressoes_total`, `cliques_total`, `ctr_medio`, `cpc_medio`, `cpm_medio`, `custo_por_lead_medio`, `criado_em`.

### 3.11. `financas_itens`
Métricas individuais de cada campanha contida nas planilhas do Meta Ads:
- `id`, `upload_id` (FK), `mes_referencia`, `semana_rotulo`, `nome_campanha`, `status_veiculacao`, `orcamento`, `tipo_orcamento`, `valor_gasto`, `resultados`, `custo_por_resultado`, `impressoes`, `cpm`, `cliques`, `ctr`, `cpc`, `inicio_relatorio`, `fim_relatorio`, `criado_em`.

### 3.12. `financas_despesas`
Registro de comprovantes e faturas de anúncios em PDF arquivadas:
- `id`, `nome_arquivo`, `caminho_arquivo`, `tamanho_bytes`, `data_despesa`, `valor`, `descricao`, `conta_anuncio`, `metodo_pagamento`, `observacoes`, `criado_em`.

### 3.13. `financas_lancamentos_diarios`
Balanço financeiro diário para cálculo contábil e DRE:
- `id`, `data_lancamento` (`YYYY-MM-DD`), `mes_referencia` (`YYYY-MM`), `gasto_campanhas`, `lucro_bruto`, `descricao`, `categoria`, `criado_em`, `atualizado_em`.
- *Regra Contábil:* `lucro_liquido = lucro_bruto - gasto_campanhas`.
- *Regra dos 70%:* `reinvestimento_campanhas = lucro_liquido * 0.70` e `distribuicao_socios = lucro_liquido * 0.30` (se lucro > 0).
