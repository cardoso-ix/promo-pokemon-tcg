# Estado Atual — Plataforma Promo Pokémon TCG (Nuvem 24/7)

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A plataforma de automação de vendas, captação de clientes e atendimento inteligente de **Pokémon TCG** opera de maneira **100% autônoma, permanente e em nuvem na VPS HostGator própria gerenciada pelo Coolify**. 

O ecossistema é composto por **dois serviços independentes em contêineres Docker** com volumes de armazenamento persistente NVMe (`/app/data`), garantindo que tanto as sessões do WhatsApp quanto os bancos de dados nunca sejam perdidos:
- **Replicador de Ofertas** (`app/` — Porta 3000): Tema Água 💧
- **Bot Disparador, Prospecção & IA** (`bot-disparador/` — Porta 3333): Tema Fogo 🔥

Na raiz do projeto, opera um **Orquestrador Monorepo (NPM Workspaces)** que unifica a instalação de dependências, builds e suítes de testes, com suporte a scripts turnkey (`setup-novo-pc.bat` / `.sh`, `iniciar-dev.bat` / `.sh`) para permitir abrir e continuar o desenvolvimento em qualquer computador em menos de 3 minutos.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Ambiente / Status | Descrição |
| :--- | :--- | :--- | :--- |
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (Tema Água 💧)** | Layout moderno com Sidebar limpa, cor azul ciano oceano e motor de partículas com gotículas e bolhas d'água 3D em 60fps. Monitora grupos, intercepta concorrentes, encurta para `meli.la` e replica com foto 2X HD. |
| **Bot Disparador & Leads** | TypeScript + Baileys + Spintax | 🟢 **Online 24/7 (Tema Fogo 🔥)** | Layout moderno com Sidebar limpa, cor vermelho rubi/âmbar e motor de partículas com brasas e fagulhas incandescentes 3D em 60fps. Extração de leads, disparos anti-ban e atendimento IA com DeepSeek. |
| **Atendimento IA Privado** | DeepSeek V4 (OpenCode Gateway) | 🟢 **Online 24/7 (VPS HostGator)** | Responde clientes no privado imitando especialista amigável de Pokémon TCG com digitação humanizada. |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo (Sentinel 45m)** | Monitorado pelo Cookie Sentinel em tempo real, encurtador oficial `https://meli.la/xxxxxx` e fallback resiliente. |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Named Volumes)** | `replica.db` e `disparador.db` salvos com segurança em `/app/data` via volumes Docker `promo_replica_data` e `bot_disparador_data`. |
| **Cockpits Web & Segurança** | Fastify + WebSockets + UI TCG | 🟢 **Online (Inter & Outfit)** | Interface temática com tipografia unificada `Inter` e `Outfit`, sem poluição, cards com `backdrop-filter: blur(16px)` e alternância rápida no Top Header. |
| **Google Planilhas ("produtos tcg valores")** | Webhook Apps Script + Dual-Write Local | 🟢 **Ativo (Sincronização Contínua)** | Registra automaticamente cada oferta enviada nos grupos com Data/Hora, Nome do Produto, Valor Promocional (Por), Preço Original (De) e Link Afiliado. |
| **Mensagem Diária de Abertura (07:00 AM)** | Scheduler Nativo (Fuso de Brasília) | 🟢 **Ativo (Anti-Duplicidade)** | Dispara automaticamente mensagem calorosa todas as manhãs às 07:00 AM com rotação entre 4 modelos de alta qualidade. |
| **Gerador de Anúncios Reativo** | Fastify + Scraper ML + Preview ao Vivo | 🟢 **Ativo (Replicador)** | Puxa dados reais do produto via link, foto 2X, De/Por e permite disparo manual com 1 clique para os grupos selecionados. |
| **Módulo de Gestão Financeira Meta Ads** | XLSX/CSV Parser + PDF Invoices + SQLite | 🟢 **Ativo (Disparador)** | Upload semanal de planilhas de anúncios, faturas em PDF, cálculo de CPL, CTR, CPC, CPM, Ranking de Campanhas e evolução semanal. |
| **Balanço Diário DRE & Regra 70%** | SQLite + Relatórios Executivos | 🟢 **Ativo (Disparador)** | Lançamento diário de receitas e despesas, cálculo de lucro líquido e alocação automática de 70% do lucro para reinvestimento em campanhas e 30% para distribuição aos sócios. |
| **Meta Cloud API & Utility Templates** | Meta Graph API + Spintax Seguro | 🟢 **Ativo (Disparador)** | Disparo oficial aprovado pela Meta com templates de serviço (`UTILITY` a ~R$ 0,18) prevenindo custos de marketing e bloqueios. |
| **Ponte Interna Docker** | HTTP REST com Header de Segurança | 🟢 **Ativo (promo_network)** | Transmissão automática de ofertas do Replicador para a fila do Disparador via `POST /api/internal/oferta`. |

---

## 3. URLs e Acessos em Produção (Nuvem)

Ambos os serviços operam 24/7 na VPS HostGator:

* **Painel Replicador de Ofertas**:  
  👉 **`http://108.174.145.77:3000`** (Local: `http://localhost:3000`)
* **Painel Bot Disparador & Atendimento IA**:  
  👉 **`http://108.174.145.77:3333`** (Local: `http://localhost:3333`)
* **Painel de Gestão Coolify**:  
  👉 **`http://108.174.145.77:8000`**
* **Repositório GitHub Oficial**:  
  👉 `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`)

> [!NOTE]
> Credenciais padrão de acesso a ambos os cockpits:  
> Usuário: **`admin`** | Senha: **`promo2026`** (Sessão segura de 30 dias via HMAC-SHA256).

---

## 4. Cobertura de Testes Automatizados

- **Total de Testes:** **128 testes unitários** (100% aprovados, 0 falhas).
  - `app` (Replicador): **90 testes aprovados**.
  - `bot-disparador`: **38 testes aprovados**.
- Executável com um único comando na raiz do projeto: `npm test`.

---

## 5. Preparação para Novo Computador

O repositório está 100% pronto para ser clonado em outra máquina:
- **Guia passo a passo:** [GUIA_MIGRACAO_NOVO_PC.md](../GUIA_MIGRACAO_NOVO_PC.md)
- **Script Windows:** `setup-novo-pc.bat` (instala, compila e testa automaticamente)
- **Script Unix:** `setup-novo-pc.sh`
- **Modo Desenvolvimento:** `iniciar-dev.bat` / `iniciar-dev.sh` (com Hot Reload)
- **Encerramento de Portas:** `parar.bat` / `parar.sh` (mata processos nas portas 3000 e 3333)
