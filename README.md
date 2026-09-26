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

## 📦 Módulos do Sistema em Produção

### 1. 🌊 Replicador de Ofertas (`app/` — Porta 3000)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3000`** | **Local:** 👉 **`http://localhost:3000`**
- **Tema Visual:** **Tipo Água Pokémon TCG** (Azul Cyan `#00e5ff`, Pokéball Água, Gotículas & Bolhas 3D animadas em 60fps com fundo atmosférico).
- **Objetivo:** Monitora grupos de ofertas concorrentes 24/7, intercepta links de produtos, higieniza mensagens removendo assinaturas de terceiros, gera links de afiliados oficiais com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X HD e replica nos seus grupos VIP.
- **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script.
- **🌅 Mensagem Diária de Abertura (07:00 AM):** Posta automaticamente todas as manhãs no horário oficial de Brasília uma mensagem de boas-vindas e engajamento nos grupos de destino ativos com rotação de 4 templates selecionados a dedo.
- **🛡️ Cookie Sentinel:** Validador em background a cada 45 minutos da integridade da sessão do Mercado Livre.
- **⚡ Gerador de Anúncios Reativo:** Interface no painel para colar qualquer link do Mercado Livre, puxar título limpo, foto oficial 2X, preço De/Por, preencher cupom e disparar com 1 clique.

---

### 2. 🔥 Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/` — Porta 3333)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3333`** | **Local:** 👉 **`http://localhost:3333`**
- **Tema Visual:** **Tipo Fogo Pokémon TCG** (Vermelho Rubi `#ef4444`, Laranja Brasa `#f97316`, Pokéball Fogo, Brasas Incandescentes 3D em 60fps com fundo atmosférico).
- **Objetivo:** Captação de membros de grupos em 1 clique, disparos em massa com proteção anti-ban e Spintax `{A|B|C}`, simulador oficial do WhatsApp ao vivo lado a lado, modelos prontos de alta conversão de Pokémon TCG e atendimento privado automático com **Inteligência Artificial DeepSeek V4 (OpenCode Gateway)**.
- **🛡️ Meta Shield Anti-Ban:** Auditor heurístico em tempo real que pontua o risco de cada template (0-100) e sugere melhorias com IA.
- **🔍 Filtro de Grupos em Tempo Real:** Campo de pesquisa instantânea ao selecionar grupos para criação e disparo de campanhas.
- **🏷️ Meta Cloud API & Utility Templates:** Suporte a disparo oficial via Meta Cloud API com templates categorizados como `UTILITY` (~R$ 0,18) aprovados pela Meta para evitar custos abusivos de `MARKETING`.
- **💼 Módulo de Gestão Financeira, Balanço DRE & Meta Ads:**
  - **Upload Semanal de Planilhas e PDFs:** Suporte a `.xlsx`, `.xls` e `.csv` exportados do Meta Ads Manager e upload de PDFs de faturas com arquivamento seguro em `/app/data/financas_uploads/`.
  - **Parser Inteligente:** Detecção flexível de cabeçalhos (pt-BR e en-US), conversão de moedas (`R$ 1.234,56`), separadores de milhar e datas.
  - **Dashboard com KPIs Executivos:** Investimento Total no Mês, Leads Gerados, Custo Médio por Lead (CPL com selo de eficiência), Volume de Cliques, Impressões, CTR, CPC e CPM.
  - **Balanço Diário e DRE:** Lançamento diário de despesas de marketing vs faturamento/lucro bruto do dia.
  - **Regra dos 70% de Reinvestimento:** Cálculo automático de 70% do lucro líquido mensal destinado para reinvestimento agressivo em tráfego e 30% para distribuição aos sócios.
  - **Exportação & Impressão Executiva:** Download consolidado em `.csv` (com BOM UTF-8 para Excel) e impressão/salvar em PDF com layout profissional otimizado (`@media print`).

---

### 3. 🌉 Ponte Interna Docker (Rede Segura)
Os dois módulos conversam através da rede interna (`promo_network`):
- Sempre que uma oferta é postada no grupo VIP pelo Replicador, ela é transmitida com token seguro para `http://bot-disparador:3333/api/internal/oferta`.
- A oferta cai na aba **Ofertas Recebidas** do Bot Disparador pronta para ser disparada aos leads com 1 clique!

---

## 🎨 Design System Unificado
Ambos os cockpits seguem rigorosamente os mesmos princípios de alta performance e elegância:
- **Tipografia:** `Outfit` (títulos e headings) e `Inter` (corpo e formulários).
- **Glassmorphism de Alta Proteção:** Cards, modais e cabeçalhos com `backdrop-filter: blur(16px)` garantindo 100% de nitidez e legibilidade sobre os efeitos de fundo.
- **Alternância Entre Cockpits:** Botão dinâmico no Top Header que detecta o IP/host automaticamente e permite navegar entre Replicador (`:3000`) e Disparador (`:3333`) com 1 clique.
- **Credenciais Padrão:** Usuário: `admin` | Senha: `promo2026` (Sessão criptografada HMAC válida por 30 dias).

---

## 🧪 Cobertura de Testes Automatizados (128 Testes — 100% Verde)

A plataforma conta com uma suíte de testes unitários e de integração abrangente:

| Módulo | Qtd Testes | Foco de Validação | Status |
| :--- | :--- | :--- | :--- |
| **Replicador (`app/`)** | **90 testes** | Desduplicação cross-group, parsing de preços/cupons, extração de anúncios ML, nicho TCG, rotação 07:00 AM, ponte interna | 🟢 100% Aprovado |
| **Disparador (`bot-disparador/`)** | **38 testes** | Spintax, Meta Shield, OpenCode/DeepSeek V4, Parser Meta Ads, DRE financeiro, faturas PDF, templates utility | 🟢 100% Aprovado |
| **Total do Projeto** | **128 testes** | **Zero falhas em ambos os módulos** | 🟢 **100% VERDE** |

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
