# Promo Pokémon TCG — Réplica Autônoma de Promoções

Aplicação moderna, leve e 100% autônoma em **Node.js e TypeScript**, projetada para operar 24 horas por dia na nuvem (Railway / Render) ou localmente. O sistema monitora grupos de WhatsApp de ofertas de Pokémon TCG, substitui links concorrentes por links oficiais de afiliado do Mercado Livre com encurtamento `meli.la`, replica mídias em alta fidelidade e republica nos grupos de destino em tempo real.

---

## 🚀 Funcionalidades Principais

1. **Monitoramento & Replicação em Tempo Real (WhatsApp Baileys)**:
   - Conexão nativa e direta com o WhatsApp via `@whiskeysockets/baileys` sem intermediários.
   - Rotas flexíveis (Muitos grupos de Origem ➔ Muitos grupos de Destino).
   - Suporte completo a mensagens com fotos diretas, mensagens temporárias (*ephemeral*), visualização única (*viewOnce*) e mensagens enviadas pelo próprio celular pareado (`deviceSentMessage`).

2. **Encurtamento Oficial `meli.la` & Troca de Afiliado**:
   - Integração com a API de Afiliados do Mercado Livre via cookie de sessão.
   - Gera links curtos oficiais de alta conversão: `https://meli.la/xxxxxx`.
   - Fallback automático para link parametrizado direto (`matt_word` + `matt_tool` + `forceInApp=true`).
   - Limpeza inteligente de assinaturas concorrentes (`@rasgabooster.tcg`, hashtags) preservando quebras de linha e blocos de texto humanos.

3. **Replicação Fiel de Mídias**:
   - Desembrulha e encaminha o buffer exato da foto original enviada no WhatsApp.
   - Para posts somente texto com link do Mercado Livre, faz scraping automático da foto oficial do produto em alta resolução (**2X**).

4. **Cockpit & Dashboard Web em Tempo Real**:
   - Alternador Geral (Ligar / Desligar Esteira).
   - Gerenciamento de Rotas com lista de grupos sincronizados.
   - Configuração de tags de afiliado, cookies do Mercado Livre e teste de conexão com a API.
   - Feed de postagens ao vivo via WebSocket e histórico com filtros e paginação.

5. **Alta Disponibilidade e Nuvem 24/7**:
   - Configurado para rodar no **Railway** ou **Render** com volume persistente em `/app/data`.
   - Mantém a sessão do WhatsApp (`auth_baileys`) e o banco SQLite (`replica.db`) preservados entre restarts e deploys.

---

## ☁️ Como Rodar na Nuvem 24/7 (Recomendado)

O sistema pode rodar 100% online sem depender do seu computador ficar ligado.

1. **Deploy no Railway**:
   - Crie um novo projeto no [railway.app](https://railway.app) a partir deste repositório GitHub.
   - Adicione um Volume Persistente apontando para `/app/data`.
   - Gere um domínio público em **Settings** ➔ **Networking**.
   - Acesse o link gerado, escaneie o QR Code no seu WhatsApp e configure suas rotas.
   - Consulte o guia completo e detalhado em [`docs/deploy-nuvem.md`](docs/deploy-nuvem.md).

---

## 💻 Como Rodar Localmente (Windows)

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
