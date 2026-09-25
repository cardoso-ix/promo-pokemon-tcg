# ⚡ Promo Pokémon TCG — Plataforma Completa de Automação (Nuvem 24/7)

Ecossistema profissional em **Node.js 22 LTS e TypeScript** para automação de vendas, promoções, captação de clientes e atendimento inteligente de **Pokémon TCG** no WhatsApp.

A plataforma opera **100% online na nuvem em VPS própria (HostGator) gerenciada pelo Coolify** com persistência contínua em Named Volumes, acessível de qualquer dispositivo (computador, tablet ou celular) sem depender de máquina local ligada.

---

## 📦 Módulos do Sistema em Produção

### 1. 🌊 Replicador de Ofertas (`app/` — Porta 3000)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3000`**
- **Tema Visual:** **Tipo Água Pokémon TCG** (Azul Cyan `#00e5ff`, Pokéball Água, Gotículas & Bolhas 3D animadas em 60fps com fundo atmosférico).
- **Objetivo:** Monitora grupos de ofertas concorrentes 24/7, intercepta links de produtos, higieniza mensagens removendo assinaturas de terceiros, gera links de afiliados oficiais com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X e replica nos seus grupos VIP.
- **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script.
- **🌅 Mensagem Diária de Abertura (07:00 AM):** Posta automaticamente todas as manhãs no horário oficial de Brasília uma mensagem de boas-vindas e engajamento nos grupos de destino ativos.
- **🛡️ Cookie Sentinel:** Validador em background a cada 45 minutos da integridade da sessão do Mercado Livre.

---

### 2. 🔥 Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/` — Porta 3333)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3333`**
- **Tema Visual:** **Tipo Fogo Pokémon TCG** (Vermelho Rubi `#ef4444`, Laranja Brasa `#f97316`, Pokéball Fogo, Brasas Incandescentes 3D em 60fps com fundo atmosférico).
- **Objetivo:** Captação de membros de grupos em 1 clique, disparos em massa com proteção anti-ban e Spintax `{A|B|C}`, simulador oficial do WhatsApp ao vivo lado a lado, modelos prontos de alta conversão de Pokémon TCG e atendimento privado automático com **Inteligência Artificial DeepSeek V4 (OpenCode Gateway)**.
- **🛡️ Meta Shield Anti-Ban:** Auditor heurístico em tempo real que pontua o risco de cada template (0-100) e sugere melhorias com IA.
- **🔍 Filtro de Grupos em Tempo Real:** Campo de pesquisa instantânea ao selecionar grupos para criação e disparo de campanhas.
- **💼 Módulo de Gestão Financeira & Relatórios Meta Ads:**
  - **Upload Semanal de Planilhas:** Suporte nativo a `.xlsx`, `.xls` e `.csv` exportados do Meta Ads Manager, com armazenamento físico seguro dos arquivos brutos para auditoria em `/app/data/financas_uploads/`.
  - **Parser Inteligente:** Detecção flexível de cabeçalhos (pt-BR e en-US), conversão de moedas (`R$ 1.234,56`), separadores de milhar e datas.
  - **Dashboard com KPIs Executivos:** Investimento Total no Mês, Leads/Cadastros Gerados, Custo Médio por Lead (CPL com selo de eficiência), Volume de Cliques, Impressões, CTR, CPC e CPM.
  - **Evolução Semana a Semana:** Comparativo de desempenho entre as semanas do mês com valores apurados.
  - **Performance por Campanha:** Ranking consolidado de campanhas com fatia de orçamento (`share`), volume de leads e CPL individual.
  - **Exportação & Impressão Executiva:** Download consolidado em `.csv` (com BOM UTF-8 para Excel) e impressão/salvar em PDF com layout profissional otimizado (`@media print`).

---

## 🎨 Design System Unificado
Ambos os cockpits seguem rigorosamente os mesmos princípios de alta performance e elegância:
- **Tipografia:** `Outfit` (títulos e headings) e `Inter` (corpo e formulários).
- **Glassmorphism de Alta Proteção:** Cards, modais e cabeçalhos com `backdrop-filter: blur(16px)` garantindo 100% de nitidez e legibilidade sobre os efeitos de fundo.
- **Alternância Entre Cockpits:** Botão dinâmico no Top Header que detecta o IP/host automaticamente e permite navegar entre Replicador (`:3000`) e Disparador (`:3333`) com 1 clique.
- **Credenciais Padrão:** Usuário: `admin` | Senha: `promo2026` (Sessão criptografada HMAC válida por 30 dias).

---

## ☁️ Arquitetura em Nuvem & Deploy na VPS

Ambos os serviços rodam em contêineres Docker independentes com persistência NVMe montada em `/app/data` gerenciada pelo **Coolify**:
- **Named Volumes Blindados:** `promo_replica_data` e `bot_disparador_data` mantêm as sessões ativas do WhatsApp (Baileys) e os bancos SQLite (`replica.db` e `disparador.db`) permanentemente preservados mesmo após rebuilds ou atualizações de código.
- **Ponte Interna Docker (`promo_network`):** O Replicador notifica diretamente o Bot Disparador quando identifica ofertas imperdíveis de Pokémon TCG.
- **Deploy Contínuo via Webhook:**
  ```bash
  # Endpoint de deploy automático no Coolify:
  POST http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra
  ```

---

## 💻 Como Rodar e Desenvolver no Notebook

Caso vá continuar o desenvolvimento na sua máquina local ou notebook:

### 1. Clonar o Repositório
```bash
git clone https://github.com/cardoso-ix/promo-pokemon-tcg.git
cd promo-pokemon-tcg
```

### 2. Instalar as Dependências
```bash
npm install --prefix app
npm install --prefix bot-disparador
```

### 3. Rodar os Testes Unitários (88 Testes)
```bash
# Testar Replicador de Ofertas (60 testes):
npm test --prefix app

# Testar Bot Disparador, Spintax e IA (28 testes):
npm test --prefix bot-disparador
```

### 4. Iniciar os Serviços Locais
- **No Windows (Scripts Prontos):**
  - `iniciar-tudo.bat` — Inicia Replicador (`:3000`) e Disparador (`:3333`) simultaneamente.
  - `iniciar.bat` — Inicia apenas o Replicador (`:3000`).
  - `iniciar-disparador.bat` — Inicia apenas o Disparador (`:3333`).
  - `parar.bat` — Encerra as instâncias em execução.
- **Via Terminal (Modo Dev com Hot Reload):**
  ```bash
  # Terminal 1: Replicador
  cd app && npm run dev

  # Terminal 2: Disparador
  cd bot-disparador && npm run dev
  ```

---

## 📁 Estrutura do Repositório

```text
promo-pokemon-tcg/
├── app/                        # Módulo Replicador de Ofertas (Porta 3000)
│   ├── src/                    # Código-fonte (Core, DB, Public, Web, WhatsApp)
│   ├── test/                   # 60 testes unitários automatizados
│   └── README.md               # Documentação dedicada do Replicador
│
├── bot-disparador/             # Módulo Disparador, Prospecção e IA (Porta 3333)
│   ├── src/                    # Código-fonte (AI, Core, DB, Public, Web, WhatsApp)
│   ├── test/                   # 28 testes unitários automatizados
│   └── README.md               # Documentação dedicada do Disparador
│
├── docs/                       # Documentação técnica e operacional completa
│   ├── arquitetura.md          # Arquitetura dos serviços em nuvem
│   ├── banco-de-dados.md       # Esquema dos bancos SQLite (replica.db e disparador.db)
│   ├── deploy-coolify.md       # Guia oficial de deploy na VPS com Coolify
│   ├── estado-atual.md         # Status atual da plataforma
│   ├── google-sheets-integracao.md # Integração com o Google Planilhas
│   ├── historico-de-decisoes.md# Decisões técnicas e stack adotada
│   ├── regras-de-negocio.md    # Regras de conversão de links e mídia
│   ├── runbook.md              # Manual de operação dos painéis online
│   └── troubleshooting.md      # Resolução de problemas e diagnósticos
│
├── docker-compose.coolify.yml  # Orquestração oficial de produção VPS/Coolify
├── docker-compose.yml          # Orquestração local dos dois serviços
├── CONTEXT.md                  # Fonte Única da Verdade para agentes e desenvolvedores
└── README.md                   # Este arquivo
```
