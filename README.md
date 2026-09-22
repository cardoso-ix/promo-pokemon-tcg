# ⚡ Promo Pokémon TCG — Plataforma Completa de Automação (Nuvem 24/7)

Ecossistema profissional em **Node.js 22 LTS e TypeScript** para automação de vendas, promoções e captação de clientes de **Pokémon TCG** no WhatsApp.

A plataforma opera **100% online na nuvem em VPS própria (HostGator) gerenciada pelo Coolify** com persistência contínua em Named Volumes, acessível de qualquer dispositivo (computador ou celular) sem depender de máquina local ligada.

---

## 📦 Módulos do Sistema em Produção

### 1. 🔄 Replicador de Ofertas (`app/`)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3000`**
- **Objetivo:** Monitora grupos de ofertas de Pokémon TCG 24/7, intercepta links concorrentes, substitui por links de afiliado oficiais do Mercado Livre com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X e replica nos seus grupos de destino.
- **Interface & Resiliência:** Cockpit temático **Pokémon TCG (Ultra Ball & Rare Holo Foil)** com medidor animado de **HP da Sessão**, simulador autêntico de balões do WhatsApp Dark, **Watchdog Baileys** (heartbeat a cada 45s) e **Cookie Sentinel** automático para validação contínua da sessão do Mercado Livre.
- **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script e sincronização local no Google Drive. Consulte [`docs/google-sheets-integracao.md`](docs/google-sheets-integracao.md).
- **🌅 Mensagem Diária de Abertura (07:00 AM):** Posta automaticamente todas as manhãs no horário oficial de Brasília uma mensagem de bom dia nos grupos de destino ativos, agradecendo aos membros, anunciando o rastreamento das melhores ofertas de Pokémon TCG e incentivando os membros a convidarem amigos para crescer a comunidade. Totalmente configurável no painel com botão de teste instantâneo.

### 2. 🚀 Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/`)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3333`**
- **Objetivo:** Captação de membros de grupos em 1 clique, disparos em massa com proteção anti-ban e Spintax, simulador oficial do WhatsApp ao vivo lado a lado, modelos prontos de alta conversão de Pokémon TCG e atendimento privado automático com **Inteligência Artificial DeepSeek V4 (OpenCode Gateway)**.
- **Documentação Completa:** Consulte [`bot-disparador/README.md`](bot-disparador/README.md).

---

## ☁️ Arquitetura em Nuvem, VPS & Deploy Contínuo

Ambos os serviços rodam em contêineres Docker independentes com persistência NVMe montada em `/app/data` gerenciada pelo **Coolify**:
- Mantém as **sessões ativas do WhatsApp (Baileys)** conectadas mesmo durante atualizações de código através de **Named Volumes** (`promo_replica_data` e `bot_disparador_data`).
- Bancos SQLite (`replica.db` e `disparador.db`) salvos com total segurança e modo WAL.
- **Ponte Interna Docker (`promo_network`):** O Replicador notifica diretamente o Bot Disparador quando identifica ofertas imperdíveis de Pokémon TCG.
- Atualização contínua: todo `git push origin main` pode ser republicado diretamente no painel do Coolify (`http://108.174.145.77:8000`).

### Hospedagem Oficial:
- **🚀 VPS Própria HostGator com Coolify:**
  - Orquestrado via `docker-compose.coolify.yml` com Named Volumes, healthcheck automático e rede interna.
  - Consulte o guia completo em [`docs/deploy-coolify.md`](docs/deploy-coolify.md).

---

## 💻 Ambiente de Desenvolvimento Local (Opcional)

Caso queira testar ou desenvolver novas funcionalidades na sua máquina antes de enviar para a nuvem:

| Módulo | Como Iniciar | Porta Local |
|---|---|---|
| **Iniciar Tudo (Ambos os Módulos)** | Duplo clique em `iniciar-tudo.bat` | Portas 3000 e 3333 |
| **Replicador de Ofertas** | Duplo clique em `iniciar.bat` | `http://localhost:3000` |
| **Bot Disparador & IA** | Duplo clique em `iniciar-disparador.bat` | `http://localhost:3333` |
| **Parar Serviços Locais** | Duplo clique em `parar.bat` | — |

---

## 🧪 Testes Automatizados

O ecossistema possui suíte completa de testes unitários para os dois módulos:

```bash
# Testar Replicador de Ofertas
cd app && npm test

# Testar Bot Disparador, Spintax e IA
cd bot-disparador && npm test
```

---

---

## 🔌 Model Context Protocol (MCP) & Extensões de IA

O repositório conta com integração nativa de servidores MCP (Model Context Protocol) para alimentar agentes inteligentes (Antigravity IDE e Cursor) com ferramentas externas:

* **🔥 Firecrawl MCP Server (`firecrawl`):**
  - **Endpoint:** `https://mcp.firecrawl.dev/v2/mcp`
  - **Função:** Web scraping avançado com headless browser, extração de dados estruturados em Markdown, pesquisa na web (`firecrawl_search`), scraping de páginas dinâmicas (`firecrawl_scrape`) e crawling profundo de catálogos e sitemaps.
  - **Autenticação:** Opera em modo *keyless* por padrão (com cotas diárias gratuitas) ou via token Bearer (`Authorization: Bearer <FIRECRAWL_API_KEY>`) para cotas de equipe e ferramentas completas.
* **🛍️ Mercado Livre MCP Server (`mercadolibre-mcp-server`):**
  - **Endpoint:** `https://mcp.mercadolibre.com/mcp`
  - **Função:** Consulta direta a produtos, itens e informações do ecossistema Mercado Livre.

As configurações estão centralizadas em `.cursor/mcp.json` e `.agents/mcp_config.json`.

---

## 📁 Estrutura do Repositório

```text
promo-pokemon-tcg/
├── .agents/                    # Configurações nativas do Antigravity (regras e mcp_config.json)
├── .cursor/                    # Configurações do Cursor IDE (mcp.json, hooks, rules)
├── app/                        # Módulo Replicador de Ofertas (Porta 3000)
├── bot-disparador/             # Módulo Disparador, Extração de Leads e IA (Porta 3333)
├── docs/                       # Documentação técnica e operacional
│   ├── arquitetura.md          # Arquitetura dos serviços em nuvem
│   ├── banco-de-dados.md       # Esquema dos bancos SQLite (replica.db e disparador.db)
│   ├── deploy-coolify.md       # Guia oficial de deploy na VPS com Coolify
│   ├── deploy-nuvem.md         # Manual de deploy 24/7 (Railway / Render / VPS)
│   ├── estado-atual.md         # Status atual da plataforma
│   ├── historico-de-decisoes.md# Decisões técnicas e stack adotada
│   ├── regras-de-negocio.md    # Regras de conversão de links e mídia
│   ├── runbook.md              # Manual de operação dos painéis online
│   └── troubleshooting.md      # Resolução de problemas e diagnósticos
├── .env.example                # Modelo oficial de variáveis de ambiente para produção
├── docker-compose.yml          # Orquestração local dos dois serviços
├── docker-compose.coolify.yml  # Orquestração de produção VPS/Coolify com Traefik e Named Volumes
├── Dockerfile                  # Container Docker do Replicador
├── railway.json                # Deploy Railway
└── render.yaml                 # Blueprint Render com discos persistentes
```
