# ⚡ Promo Pokémon TCG — Plataforma Completa de Automação

Ecossistema profissional em **Node.js e TypeScript** para automação de vendas, promoções e captação de clientes de **Pokémon TCG** no WhatsApp.

O projeto é dividido em **dois módulos independentes**:

---

## 📦 Módulos do Sistema

### 1. 🔄 Módulo Replicador de Promoções (`app/` — Porta `3000`)
- **Objetivo:** Monitora grupos de ofertas de Pokémon TCG 24/7, intercepta links concorrentes, substitui por links de afiliado oficiais do Mercado Livre com encurtamento `meli.la`, preserva/baixa fotos em 2X e replica nos seus grupos de destino.
- **Como Iniciar:** Dê dois cliques em **`iniciar.bat`** (ou execute `cd app && npm start`).
- **Painel:** 👉 **`http://localhost:3000`**

### 2. 🚀 Módulo Disparador & Atendimento IA (`bot-disparador/` — Porta `3333`)
- **Objetivo:** Captação de membros de grupos em 1 clique, disparos em massa com proteção anti-ban e Spintax, simulador oficial do WhatsApp ao vivo lado a lado, modelos prontos de alta conversão de Pokémon TCG e atendimento privado automático com **Inteligência Artificial DeepSeek V4 (OpenCode)**.
- **Como Iniciar:** Dê dois cliques em **`iniciar-disparador.bat`** (ou execute `cd bot-disparador && npm start`).
- **Painel:** 👉 **`http://localhost:3333`**
- **Documentação Completa:** Consulte [`bot-disparador/README.md`](bot-disparador/README.md).

---

## 🚀 Como Rodar Localmente (Windows)

| Ação | Como Executar | Acesso no Navegador |
|---|---|---|
| **Iniciar Replicador de Ofertas** | Duplo clique em `iniciar.bat` | `http://localhost:3000` |
| **Iniciar Bot Disparador & IA** | Duplo clique em `iniciar-disparador.bat` | `http://localhost:3333` |
| **Parar Replicador** | Duplo clique em `parar.bat` | — |

---

## ☁️ Como Rodar na Nuvem 24/7 (Replicador)

O replicador pode rodar 100% online na nuvem sem depender do seu computador ficar ligado.
Consulte o guia completo em [`docs/deploy-nuvem.md`](docs/deploy-nuvem.md) para Railway ou Render.

### Opção 1: Scripts Rápidos
- **`iniciar.bat`**: Inicia o servidor com terminal visível para acompanhar logs em tempo real.
- **`iniciar-segundo-plano.vbs`**: Inicia o servidor silenciosamente em segundo plano.
- **`parar.bat`**: Finaliza o servidor na porta 3000 caso queira reiniciar ou pausar.

### Opção 2: Linha de Comando
```bash
# Acessar a pasta da aplicação
cd app

# Instalar dependências
npm install

# Compilar TypeScript e assets
npm run build

# Iniciar o servidor
npm start
```

Após iniciar, acesse no navegador:
👉 **`http://localhost:3000`**

---

## 🧪 Testes Automatizados

A aplicação conta com testes unitários cobrindo conversão de links, limpeza de markdown, preservação de quebras de linha e desembrulho de mídia WhatsApp:

```bash
cd app
npm test
```

---

## 📁 Estrutura do Repositório

```text
promo-pokemon-tcg/
├── app/                        # Código-fonte da aplicação autônoma
│   ├── src/
│   │   ├── config.ts           # Configurações de ambiente, portas e caminhos
│   │   ├── core/
│   │   │   └── affiliate.ts    # Encurtador meli.la, scraping 2X, regex e limpeza
│   │   ├── db/
│   │   │   └── database.ts     # Camada SQLite (rotas, configs, logs, chats)
│   │   ├── public/             # Frontend do cockpit web (HTML5, CSS3, JS Vanilla)
│   │   ├── web/
│   │   │   └── server.ts       # Servidor Fastify REST & WebSocket
│   │   ├── whatsapp/
│   │   │   └── client.ts       # Gerenciador Baileys WhatsApp (auth, QR, msgs)
│   │   └── index.ts            # Ponto de entrada do sistema
│   ├── test/                   # Testes automatizados (Node Test Runner)
│   └── package.json
├── data/                       # Armazenamento persistente (ignorado pelo Git)
│   ├── replica.db              # Banco SQLite com configurações, rotas e logs
│   └── auth_baileys/           # Sessão e chaves criptográficas do WhatsApp
├── docs/                       # Documentação técnica e operacional
│   ├── arquitetura.md          # Arquitetura do sistema autônomo
│   ├── banco-de-dados.md       # Esquema e tabelas SQLite
│   ├── deploy-nuvem.md         # Guia de implantação 24/7 (Railway / Render)
│   ├── estado-atual.md         # Status atual do projeto
│   ├── historico-de-decisoes.md# Registro de decisões técnicas
│   ├── regras-de-negocio.md    # Regras de negócio, links e mídias
│   ├── runbook.md              # Manual de operação e manutenção
│   └── troubleshooting.md      # Resolução de problemas comuns
├── Dockerfile                  # Imagem Docker otimizada para produção
├── docker-compose.yml          # Orquestração local de container
├── railway.json                # Configuração de build e deploy no Railway
├── render.yaml                 # Configuração de deploy no Render
├── iniciar.bat                 # Inicializador visível (Windows)
├── iniciar-segundo-plano.vbs   # Inicializador em background (Windows)
└── parar.bat                   # Encerramento do processo (Windows)
```
