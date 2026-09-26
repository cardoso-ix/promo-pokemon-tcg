# ⚡ Promo Pokémon TCG — Plataforma Completa de Automação (Nuvem 24/7)

Ecossistema profissional em **Node.js 22 LTS e TypeScript** para automação de vendas, promoções, captação de clientes, tráfego pago, inteligência artificial e atendimento inteligente de **Pokémon TCG** no WhatsApp.

A plataforma opera **100% online na nuvem em VPS própria (HostGator) gerenciada pelo Coolify** com persistência contínua em Named Volumes NVMe, acessível de qualquer dispositivo (computador, tablet ou smartphone) sem depender de máquina local ligada.

---

## 🚀 Migração para Novo Computador (Setup em 3 Minutos)

Se você acabou de abrir este projeto em um novo computador ou notebook para continuar as melhorias:

👉 **Consulte o manual rápido:** [GUIA_MIGRACAO_NOVO_PC.md](GUIA_MIGRACAO_NOVO_PC.md)

### No Windows:
1. Instale o **Node.js v20 LTS ou v22 LTS** ([nodejs.org](https://nodejs.org/)).
2. Dê dois cliques no script **`setup-novo-pc.bat`**.  
   *(Ele instala todas as dependências, cria o `.env`, compila o código e roda os 128 testes).*
3. Para programar e testar melhorias com **Hot Reload**: dê dois cliques em **`iniciar-dev.bat`**.
4. Para rodar a versão de produção compilada: dê dois cliques em **`iniciar-tudo.bat`**.
5. Para encerrar os servidores: dê dois cliques em **`parar.bat`**.

### No Linux / macOS:
```bash
chmod +x *.sh
./setup-novo-pc.sh   # Instala dependências, compila e roda testes
./iniciar-dev.sh     # Inicia ambos os serviços em modo dev com hot reload
./parar.sh           # Encerra processos nas portas 3000 e 3333
```

---

## 📦 Plataforma Unificada em Produção

### ⚡ Super Cockpit Unificado (`web-cockpit` + `app/` — Porta 3000)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3000`** | **Local:** 👉 **`http://localhost:3000`**
- **Arquitetura Moderna (SPA Nativa sem Iframes):**
  - **Stack Visual de Ponta:** Desenvolvido em **React 19, Tailwind CSS v4, Recharts e Lucide Icons**.
  - **Visão Geral 360° com Gráficos Reativos:** Dashboard executivo completo unificando gráficos de fluxo horário de ofertas e cliques, balanço DRE auditado com dados reais, distribuição da regra de 70% de reinvestimento e saúde dos chips em tempo real.
  - **Módulo Replicador (Água 💧):** Feed de ofertas ao vivo, rotas de transmissão com toggles rápidos, gerador de anúncios TCG com prévia em tempo real e Sentinel do Mercado Livre.
  - **Módulo Disparador & IA (Fogo 🔥):** Unificação de 100% dos recursos legados: Campanhas de disparo multicanal (Baileys + Meta Cloud Oficial), captação de grupos, gestão de leads com exportação para Meta Ads Custom Audiences e Microsoft Excel, Anti-Ban com aquecimento diário (Warm Up), atendimento IA DeepSeek V4 e console de Logs ao Vivo.
  - **Módulo Finanças & DRE (Esmeralda 💼):** Dados 100% reais e auditados de campanhas e lucros. Balanço DRE consolidado (Lucros Mercado Livre vs Gastos Meta Ads), cálculo matemático da Regra dos 70% de Reinvestimento, gestão completa de faturas PDF originais arquivadas com visualizador inline e processamento de planilhas semanais XLSX.
- **Single Sign-On (SSO):** Um único login autentica simultaneamente ambos os sistemas através de cookies de sessão seguros e Gateway reverso Fastify.
- **Performance:** Zero sobrecarga de múltiplos iframes na memória; interface reativa com feedback instantâneo e tempo de carregamento sub-segundo.

---

### 1. 🌊 Módulo Replicador de Ofertas
- **Objetivo:** Monitora grupos de ofertas concorrentes 24/7, intercepta links de produtos, higieniza mensagens removendo assinaturas de terceiros, gera links de afiliados oficiais com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X HD e replica nos seus grupos VIP.
- **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script.
- **🌅 Mensagem Diária de Abertura (07:00 AM):** Posta automaticamente todas as manhãs no horário oficial de Brasília uma mensagem de boas-vindas e engajamento nos grupos de destino ativos com rotação de 4 templates selecionados a dedo.
- **🛡️ Cookie Sentinel:** Validador em background a cada 45 minutos da integridade da sessão do Mercado Livre.
- **⚡ Gerador de Anúncios Reativo:** Interface no painel para colar qualquer link do Mercado Livre, puxar título limpo, foto oficial 2X, preço De/Por, preencher cupom e disparar com 1 clique.
- **🎛️ Gestão & Edição Visual de Rotas:** Modal intuitivo para criar, editar e excluir rotas com seleção de grupos de Origem (monitoramento) e Destino (publicação) a partir dos 170+ chats do WhatsApp em cache ou por inserção manual de JID.

---

### 2. 🔥 Módulo Bot Disparador, Prospecção, Finanças & IA
- **Acesso Direto (Opcional):** 👉 **`http://108.174.145.77:3333`** | **Local:** 👉 **`http://localhost:3333`**
- **Objetivo:** Captação de membros de grupos em 1 clique, disparos em massa com proteção anti-ban e Spintax `{A|B|C}`, simulador oficial do WhatsApp ao vivo lado a lado, modelos prontos de alta conversão de Pokémon TCG e atendimento privado automático com **Inteligência Artificial DeepSeek V4 (OpenCode Gateway)**.
- **🛡️ Meta Shield Anti-Ban:** Auditor heurístico em tempo real que pontua o risco de cada template (0-100) e sugere melhorias com IA.
- **🏷️ Meta Cloud API & Utility Templates:** Suporte a disparo oficial via Meta Cloud API com templates categorizados como `UTILITY` (~R$ 0,18) aprovados pela Meta para evitar custos abusivos de `MARKETING`.
- **💼 Módulo de Gestão Financeira, Balanço DRE & Meta Ads Oficial:**
  - **Sincronização Direta Meta Ads (Graph API v20.0):** Ingestão automática e sob demanda de gastos (`spend`), impressões, cliques, compras, CPC e CTR direto da API oficial do Meta Ads para contas `act_{id}`.
  - **Banner Executivo & Modal de Conexão no Cockpit:** Gerenciamento do Token de Acesso de Sistema (`EAA...`) com armazenamento criptografado em **AES-256-GCM** e sincronização automática a cada hora.
  - **Upload Semanal de Planilhas e PDFs:** Suporte alternativo a `.xlsx`, `.xls` e `.csv` exportados do Meta Ads Manager e upload de PDFs de faturas com arquivamento seguro em `/app/data/financas_uploads/`.
  - **Dashboard com KPIs Executivos:** Investimento Total no Mês, Gasto Hoje, Cliques, Impressões, Custo por Clique (CPC), CTR e Campanhas Top Spend.
  - **Balanço Diário e DRE:** Consolidação automática de gastos de marketing vs lucros brutos do Mercado Livre.
  - **Regra dos 70% de Reinvestimento:** Cálculo automático de 70% do lucro líquido mensal destinado para reinvestimento agressivo em tráfego e 30% para distribuição aos sócios.

### 3. 🟡 Módulo Mercado Livre Afiliados (Comissões & Métricas em Tempo Real)
- **Ingestão Oficial da API de Afiliados:** Conexão nativa e contínua com a API interna do Programa de Afiliados do Mercado Livre (`/affiliate-program/api/dashboard/*`) através de sessão autenticada.
- **Métricas Executivas ao Vivo:**
  - **Comissões Confirmadas no Mês:** Total de ganhos auferidos com produtos promovidos (ex: `R$ 1.907,09`).
  - **Comissões Hoje:** Ganhos e conversões gerados no dia atual em tempo real.
  - **Vendas Brutas Geradas:** Volume financeiro gerado para o Mercado Livre através do link de afiliado (`meli.la`).
  - **Cliques & Taxa de Conversão (CVR):** Monitoramento de cliques nos links comissionados e conversão percentual de vendas (ex: `1.882 cliques` e `4,67% CVR`).
  - **Rastreamento de Produtos Comissionados:** Listagem detalhada dos últimos itens vendidos (título, foto oficial, valor de venda e comissão auferida).
- **DRE Consolidado Cruzado (Afiliado vs Meta Ads):**
  - Cruzamento em tempo real do Lucro Líquido das Comissões do Mercado Livre contra o Investimento em Tráfego Pago do Meta Ads.
  - Exemplo Prático: `R$ 1.907,09 (Comissões ML) - R$ 560,24 (Meta Ads) = R$ 1.346,85 (Lucro Operação Real)`.
  - **Regra dos 70% de Reinvestimento:** `R$ 942,79` reinvestidos no tráfego e `R$ 404,06` distribuídos para os sócios.
- **Suporte Híbrido a Vendedores (Opcional):** Webhooks push instantâneos de pedidos (`orders_v2`) e OAuth 2.0 oficial para contas sellers com armazenamento criptografado em **AES-256-GCM**.

---

### 4. 🌉 Gateway Reverso & Ponte Interna
- O servidor Fastify na porta 3000 atua como Gateway para as rotas `/api/bot/*`, viabilizando comunicação sem atritos e sem CORS.
- Sempre que uma oferta é postada no grupo VIP pelo Replicador, ela é transmitida com token seguro para `http://bot-disparador:3333/api/internal/oferta`.

---

## 🎨 Design System Unificado
- **Tipografia:** `Outfit` (títulos e headings), `Inter` (corpo e formulários) e `Fira Code` (dados técnicos).
- **Glassmorphism de Alta Proteção:** Cards, modais e cabeçalhos com `backdrop-filter: blur(16px)` garantindo 100% de nitidez e legibilidade sobre os efeitos de fundo.
- **Credenciais Padrão:** Usuário: `admin` | Senha: `promo2026` (Sessão criptografada HMAC válida por 30 dias com SSO Unificado).

---

## 🧪 Cobertura de Testes Automatizados (134 Testes — 100% Verde)

A plataforma conta com uma suíte de testes unitários e de integração abrangente:

| Módulo | Qtd Testes | Foco de Validação | Status |
| :--- | :--- | :--- | :--- |
| **Replicador (`app/`)** | **96 testes** | Desduplicação cross-group, parsing de preços/cupons, extração de anúncios ML, nicho TCG, rotação 07:00 AM, ponte interna, ingestão analítica e AES-256 | 🟢 100% Aprovado |
| **Disparador (`bot-disparador/`)** | **38 testes** | Spintax, Meta Shield, OpenCode/DeepSeek V4, Parser Meta Ads, DRE financeiro, faturas PDF, templates utility | 🟢 100% Aprovado |
| **Total do Projeto** | **134 testes** | **Zero falhas em ambos os módulos** | 🟢 **100% VERDE** |

Para executar todos os testes da raiz:
```bash
npm test
```

---

## 💻 Como Rodar e Desenvolver Localmente

### Opção 1: Scripts Turnkey (Mais Fácil)
| Script | Finalidade | Plataforma |
| :--- | :--- | :--- |
| **`setup-novo-pc.bat`** / **`.sh`** | Instalação inicial completa, build e verificação em nova máquina | Windows / Linux / Mac |
| **`iniciar-dev.bat`** / **`.sh`** | Inicia ambos os serviços com Hot Reload (`tsx watch`) para desenvolvimento | Windows / Linux / Mac |
| **`iniciar-tudo.bat`** | Inicia ambos os serviços em modo compilado (produção local) | Windows |
| **`parar.bat`** / **`.sh`** | Encerra com segurança processos nas portas 3000 e 3333 | Windows / Linux / Mac |

### Opção 2: Via Terminal (NPM Workspaces)
```bash
# Instalar dependências e compilar
npm run setup

# Rodar os 128 testes
npm test

# Iniciar Replicador em modo desenvolvimento
npm run dev:app

# Em outro terminal, iniciar Bot Disparador em modo desenvolvimento
npm run dev:bot
```

---

## ☁️ Arquitetura em Nuvem & Deploy na VPS

Ambos os serviços rodam em contêineres Docker independentes com persistência NVMe montada em `/app/data` gerenciada pelo **Coolify**:
- **Named Volumes Blindados:** `promo_replica_data` e `bot_disparador_data` mantêm as sessões ativas do WhatsApp (Baileys) e os bancos SQLite (`replica.db` e `disparador.db`) permanentemente preservados mesmo após rebuilds ou atualizações de código.
- **Ponte Interna Docker (`promo_network`):** Comunicação privada de alta velocidade entre os containers.
- **Deploy Contínuo via Webhook:**
  ```bash
  curl -X POST "http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra" \
    -H "Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed"
  ```

---

## 📁 Estrutura do Repositório

```text
promo-pokemon-tcg/
├── app/                        # Módulo Replicador de Ofertas (Porta 3000)
│   ├── src/                    # Código-fonte (Core, DB, Public, Web, WhatsApp)
│   ├── test/                   # 90 testes unitários automatizados
│   └── README.md               # Documentação dedicada do Replicador
│
├── bot-disparador/             # Módulo Disparador, Prospecção, IA e Finanças (Porta 3333)
│   ├── src/                    # Código-fonte (AI, Core, DB, Public, Web, WhatsApp)
│   ├── test/                   # 38 testes unitários automatizados
│   └── README.md               # Documentação dedicada do Disparador
│
├── docs/                       # Documentação técnica e operacional completa
│   ├── MANUAL_PROMO_POKEMON_TCG.md # Manual mestre de operação e regras
│   ├── arquitetura.md          # Arquitetura dos serviços em nuvem
│   ├── banco-de-dados.md       # Esquema dos bancos SQLite (replica.db e disparador.db)
│   ├── deploy-coolify.md       # Guia oficial de deploy na VPS com Coolify
│   ├── estado-atual.md         # Status atualizado da plataforma
│   ├── google-sheets-integracao.md # Integração com o Google Planilhas
│   ├── historico-de-decisoes.md# Decisões técnicas e stack adotada
│   ├── regras-de-negocio.md    # Regras de conversão de links e mídia
│   ├── roadmap.md              # Próximas melhorias planejadas
│   ├── runbook.md              # Manual de operação dos painéis online
│   └── troubleshooting.md      # Resolução de problemas e diagnósticos
│
├── GUIA_MIGRACAO_NOVO_PC.md    # Checklist rápido para abrir e rodar em novo PC
├── package.json                # Orquestrador Monorepo NPM Workspaces
├── setup-novo-pc.bat / .sh     # Setup turnkey para Windows e Linux/macOS
├── iniciar-dev.bat / .sh       # Inicialização em modo dev com Hot Reload
├── iniciar-tudo.bat            # Inicialização em modo produção local
├── parar.bat / .sh             # Script para matar portas 3000 e 3333
├── docker-compose.coolify.yml  # Orquestração oficial de produção VPS/Coolify
├── docker-compose.yml          # Orquestração local dos dois serviços
├── CONTEXT.md                  # Fonte Única da Verdade para agentes e desenvolvedores
└── README.md                   # Este arquivo
```
