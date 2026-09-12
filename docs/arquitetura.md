# Arquitetura — Plataforma Promo Pokémon TCG (Nuvem 24/7)

## 1. Visão Geral

A plataforma é um ecossistema de alto rendimento desenvolvido em **Node.js 22 LTS e TypeScript**, operando em **produção contínua na nuvem (Railway)** através de contêineres Docker independentes com armazenamento persistente NVMe.

O sistema divide-se em dois grandes serviços desacoplados:
1. **Replicador de Ofertas (`app/`):** Escuta promoções de Pokémon TCG em grupos de monitoramento, higieniza mensagens, encurta links via API oficial do Mercado Livre (`meli.la`) com fallback de afiliado, desembrulha mídias/fotos em 2X e replica nos grupos VIP.
2. **Bot Disparador & Atendimento IA (`bot-disparador/`):** Plataforma de prospecção e conversão contínua. Extrai contatos de grupos com 1 clique, dispara mensagens em massa anti-ban com Spintax `{Opção 1|Opção 2}` e variáveis dinâmicas, inclui simulador WhatsApp ao vivo no cockpit web e atendimento privado humanizado com **DeepSeek V4 via OpenCode Gateway**.

---

## 2. Diagrama de Arquitetura em Nuvem (Railway)

```text
                                  NUVEM RAILWAY (PRODUÇÃO 24/7)
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                                  │
 │  ┌──────────────────────────────────────────────┐  ┌───────────────────────────────────────────┐ │
 │  │        SERVIÇO 1: REPLICADOR DE OFERTAS      │  │        SERVIÇO 2: BOT DISPARADOR & IA     │ │
 │  │                  (Porta 3000)                │  │                  (Porta 3333)             │ │
 │  │                                              │  │                                           │ │
 │  │  • WhatsApp Baileys (Chip Replicador)        │  │  • WhatsApp Baileys (Chip de Disparos)     │ │
 │  │  • Encurtador Oficial API Mercado Livre      │  │  • Extrator Automático de Grupos/Leads     │ │
 │  │  • Scraper ML Imagens Oficiais 2X            │  │  • Fila Anti-Ban + Motor Spintax          │ │
 │  │  • SQLite Embarcado: replica.db              │  │  • SQLite Embarcado: disparador.db        │ │
 │  │  • Cockpit Web Fastify + WebSockets          │  │  • Cockpit Web Fastify + Simulador Live   │ │
 │  │                                              │  │  • Atendimento IA DeepSeek V4 (OpenCode)  │ │
 │  └──────────────────────┬───────────────────────┘  └─────────────────────┬─────────────────────┘ │
 │                         │                                                │                       │
 │                         ▼                                                ▼                       │
 │  ┌──────────────────────────────────────────────┐  ┌───────────────────────────────────────────┐ │
 │  │      VOLUME PERSISTENTE 1 (/app/data)        │  │      VOLUME PERSISTENTE 2 (/app/data)     │ │
 │  │  • auth_baileys/ (Sessão Replicador)         │  │  • auth/ (Sessão Disparador)              │ │
 │  │  • replica.db (Rotas, Configs, Logs)         │  │  • disparador.db (Leads, Fila, Histórico) │ │
 │  └──────────────────────────────────────────────┘  └───────────────────────────────────────────┘ │
 │                                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────────────────────┘
                 │                                                    │
                 ▼                                                    ▼
      Domínio Público HTTPS Replicador                     Domínio Público HTTPS Disparador
```

---

## 3. Detalhamento dos Componentes

### 3.1. Replicador de Ofertas (`app/`)
- **Engine**: TypeScript + Node.js 22 LTS.
- **Protocolo WhatsApp**: `@whiskeysockets/baileys` Multi-Device.
- **Encurtador ML**: Conecta em `https://www.mercadolivre.com.br/affiliate-program/api/v1/links` para produzir links curtos `https://meli.la/xxxxxx`.
- **Desembrulho de Mídia**: Converte mensagens de visualização única (`viewOnceMessageV2`), efêmeras e anexos normais em buffers para reenvio fiel aos canais de destino.
- **Armazenamento**: SQLite em modo WAL (`replica.db`).

### 3.2. Bot Disparador & Prospecção (`bot-disparador/`)
- **Captador de Membros**: Varre grupos conectados, normaliza JIDs e salva participantes em lote na tabela de contatos.
- **Motor Spintax**: Avalia padrões `{A|B|C}` recursivamente e substitui tags `{nome}`, `{saudacao}`, `{grupo}` para garantir que nenhuma mensagem seja disparada idêntica no WhatsApp.
- **Fila Anti-Ban Inteligente**:
  - Delays randômicos entre mensagens (35s a 70s).
  - Pausa de descanso de 5 minutos a cada 15 envios.
  - Horário operacional controlado (ex: 08:00 às 22:00).
- **Simulador do WhatsApp Ao Vivo**: Renderiza em tempo real um mockup oficial do WhatsApp no frontend, permitindo validar o visual, quebras de linha e formatações (`*negrito*`, `_itálico_`) antes do disparo.
- **Atendimento DeepSeek V4**:
  - Integração via OpenCode Gateway (`https://opencode.ai/zen/go/v1`).
  - Modelo `deepseek-v4-flash` / `deepseek-v4-pro`.
  - Simula digitação humana no WhatsApp (delay de 3 a 6 segundos) e responde como especialista amigável de Pokémon TCG.

---

## 4. Persistência de Dados e Recuperação de Falhas

Ambos os serviços utilizam volumes NVMe montados em `/app/data`:
1. **Sessões do WhatsApp**: As chaves criptográficas (`creds.json`, app-state) permanecem salvas, evitando a necessidade de ler QR Code após novos deploys ou reinicializações.
2. **Bancos SQLite**: Operam com journaling em WAL (`PRAGMA journal_mode = WAL`), garantindo que leituras e escritas concorrentes não causem locks e que nenhuma alteração se perca.
