# ⚡ Promo Pokémon TCG — Plataforma Completa de Automação (Nuvem 24/7)

Ecossistema profissional em **Node.js 22 LTS e TypeScript** para automação de vendas, promoções e captação de clientes de **Pokémon TCG** no WhatsApp.

A plataforma opera **100% online na nuvem (Railway)** com persistência contínua, acessível de qualquer dispositivo (computador ou celular) sem depender de máquina local ligada.

---

## 📦 Módulos do Sistema em Produção

### 1. 🔄 Replicador de Ofertas (`app/`)
- **Status:** 🟢 **Online 24/7 (Railway)**
- **Painel em Produção:** 👉 **`https://promo-replica-bot-production.up.railway.app`**
- **Objetivo:** Monitora grupos de ofertas de Pokémon TCG 24/7, intercepta links concorrentes, substitui por links de afiliado oficiais do Mercado Livre com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X e replica nos seus grupos de destino.
- **Interface & Resiliência:** Cockpit temático **Pokémon TCG (Ultra Ball & Rare Holo Foil)** com medidor animado de **HP da Sessão**, simulador autêntico de balões do WhatsApp Dark, **Watchdog Baileys** (heartbeat a cada 45s) e **Cookie Sentinel** automático para validação contínua da sessão do Mercado Livre.
- **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script e sincronização local no Google Drive. Consulte [`docs/google-sheets-integracao.md`](docs/google-sheets-integracao.md).

### 2. 🚀 Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/`)
- **Status:** 🟢 **Online 24/7 (Railway)**
- **Painel em Produção:** 👉 **Disponível no seu projeto Railway** *(com domínio público HTTPS e volume persistente)*
- **Objetivo:** Captação de membros de grupos em 1 clique, disparos em massa com proteção anti-ban e Spintax, simulador oficial do WhatsApp ao vivo lado a lado, modelos prontos de alta conversão de Pokémon TCG e atendimento privado automático com **Inteligência Artificial DeepSeek V4 (OpenCode Gateway)**.
- **Documentação Completa:** Consulte [`bot-disparador/README.md`](bot-disparador/README.md).

---

## ☁️ Arquitetura em Nuvem & Deploy Contínuo

Ambos os serviços rodam em contêineres Docker independentes no **Railway** com volumes NVMe persistentes montados em `/app/data`:
- Mantém as **sessões ativas do WhatsApp** conectadas mesmo durante atualizações de código.
- Bancos SQLite (`replica.db` e `disparador.db`) salvos com total segurança e modo WAL.
- Atualização contínua: todo `git push origin main` gera deploy automático em menos de 2 minutos.
- Consulte o guia completo em [`docs/deploy-nuvem.md`](docs/deploy-nuvem.md).

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

## 📁 Estrutura do Repositório

```text
promo-pokemon-tcg/
├── app/                        # Módulo Replicador de Ofertas (Porta 3000)
├── bot-disparador/             # Módulo Disparador, Extração de Leads e IA (Porta 3333)
├── docs/                       # Documentação técnica e operacional
│   ├── arquitetura.md          # Arquitetura dos serviços em nuvem
│   ├── banco-de-dados.md       # Esquema dos bancos SQLite (replica.db e disparador.db)
│   ├── deploy-nuvem.md         # Manual de deploy 24/7 (Railway / Render / VPS)
│   ├── estado-atual.md         # Status atual da plataforma
│   ├── historico-de-decisoes.md# Decisões técnicas e stack adotada
│   ├── regras-de-negocio.md    # Regras de conversão de links e mídia
│   ├── runbook.md              # Manual de operação dos painéis online
│   └── troubleshooting.md      # Resolução de problemas e diagnósticos
├── docker-compose.yml          # Orquestração local dos dois serviços
├── Dockerfile                  # Container Docker do Replicador
├── railway.json                # Deploy Railway
└── render.yaml                 # Blueprint Render com discos persistentes
```
