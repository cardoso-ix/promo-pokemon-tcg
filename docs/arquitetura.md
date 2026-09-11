# Arquitetura — Promo Réplica Autônoma

## 1. Visão Geral

A **Promo Réplica** é uma aplicação completa e autônoma desenvolvida em **Node.js 22 LTS e TypeScript**. Ela opera sem dependência de plataformas externas de automação (como n8n), sem intermediários de API de terceiros (como Evolution API) e sem bancos de dados pesados externos.

O sistema integra a biblioteca oficial de protocolo do WhatsApp (`@whiskeysockets/baileys`), um servidor web ultraleve com WebSockets (`Fastify`), um banco de dados relacional embarcado de alta velocidade (`better-sqlite3`), e um motor de processamento de texto e links de afiliados com suporte à API do Mercado Livre.

---

## 2. Diagrama de Fluxo de Dados

```text
  [ WhatsApp - Grupos de Origem ]
                │
                ▼ (Baileys WebSocket / messages.upsert)
  ┌─────────────────────────────────────────────────────────────┐
  │                   Núcleo da Aplicação                       │
  │                                                             │
  │  1. Desembrulhar Mídia / Texto (Normalização)               │
  │     ├── Ephemeral, ViewOnce, deviceSentMessage              │
  │     └── Extração de legenda e buffer de imagem              │
  │                                                             │
  │  2. Consulta de Rotas & Filtro Anti-Loop (SQLite)           │
  │     └── Valida se a origem está cadastrada e ativa          │
  │                                                             │
  │  3. Motor de Afiliados & Tratamento de Texto                │
  │     ├── Preservação de quebras de linha e blocos de texto   │
  │     ├── Remoção de assinaturas concorrentes (@rasgabooster) │
  │     └── Encurtador oficial meli.la (ou fallback matt_word)  │
  │                                                             │
  │  4. Enriquecimento de Mídia (Scraper ML)                    │
  │     └── Se não houver foto, baixa imagem oficial 2X do ML   │
  │                                                             │
  │  5. Persistência & Transmissão                              │
  │     ├── Gravação no diário SQLite (replica.db)              │
  │     └── Transmissão em tempo real via WebSocket             │
  └─────────────────────────────────────────────────────────────┘
          │                                      │
          ▼ (Baileys sendMessage)                ▼ (WebSocket /ws)
  [ Grupos de Destino WhatsApp ]         [ Cockpit Web Dashboard ]
```

---

## 3. Módulos do Sistema

### 3.1. Gerenciador WhatsApp (`app/src/whatsapp/client.ts`)
- **Biblioteca**: `@whiskeysockets/baileys`.
- **Autenticação**: `useMultiFileAuthState` apontando para o diretório de dados persistente (`data/auth_baileys/`).
- **Gerenciamento de Ciclo de Vida**: Reconexão automática com backoff exponencial; geração e transmissão de QR Code para o painel web; sincronização em background dos nomes e metadados dos grupos participantes.
- **Normalização de Mídias**: Descompacta camadas de encapsulamento do WhatsApp (`ephemeralMessage`, `viewOnceMessageV2`, `deviceSentMessage`) garantindo que nenhuma postagem com imagem seja ignorada.

### 3.2. Motor de Afiliados e Texto (`app/src/core/affiliate.ts`)
- **Encurtamento Oficial `meli.la`**: Conecta diretamente ao endpoint de afiliados do Mercado Livre (`/affiliate-program/api/v1/links`) utilizando o cookie de sessão do usuário. Retorna links curtos oficiais.
- **Fallback Parametrizado**: Se o cookie expirar ou falhar, insere instantaneamente os parâmetros de afiliado cadastrados (`matt_word`, `matt_tool` e `forceInApp=true`).
- **Preservação de Formatação**: Mantém a estrutura humana da mensagem original (títulos, descrições, preços e quebras de linha duplas `\n\n`), removendo apenas menções a canais concorrentes, links de convite e hashtags invasivas.
- **Scraper de Imagem Oficial**: Para postagens apenas de texto que possuam link do Mercado Livre, busca a tag `og:image` do anúncio e converte a resolução para `2X` de alta definição.

### 3.3. Banco de Dados Embarcado (`app/src/db/database.ts`)
- **Engine**: SQLite 3 via `better-sqlite3`.
- **Características**: Modos WAL (Write-Ahead Logging) para concorrência de leitura/escrita ultrarrápida, transações seguras e zero latência de rede.
- **Localização**: `/app/data/replica.db` (na nuvem) ou `data/replica.db` (local).

### 3.4. Servidor Web & WebSocket (`app/src/web/server.ts`)
- **Engine**: Fastify 5 com plugin `@fastify/websocket`.
- **Frontend**: Servido estaticamente a partir de `app/src/public/`.
- **Rotas REST**: Healthcheck (`/health`), configurações, rotas, logs e teste de cookie do Mercado Livre.
- **Canal WebSocket (`/ws`)**: Comunicação bidirecional contínua para atualização do status do WhatsApp, QR Code, métricas de envio e feed de atividades em tempo real.

---

## 4. Persistência e Nuvem (Railway / Render)

Na nuvem, o contêiner Docker monta um **Volume Persistente** no caminho:
```text
/app/data
```
Esse volume isola e protege:
1. `data/replica.db`: Todas as suas rotas, configurações e histórico.
2. `data/auth_baileys/`: Todas as chaves criptográficas e credenciais da sessão do WhatsApp.

Mesmo quando um novo código é implantado ou o container é reiniciado, **a sessão do WhatsApp permanece conectada** e as configurações são 100% preservadas.
