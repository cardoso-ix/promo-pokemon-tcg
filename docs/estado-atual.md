# Estado Atual — Plataforma Promo Pokémon TCG (Nuvem 24/7)

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A plataforma de automação de vendas e performance de **Pokémon TCG** opera de maneira **100% autônoma, leve e em nuvem na VPS própria gerenciada pelo Coolify**. 

O ecossistema foi otimizado para focar integralmente na atração via **Tráfego Pago (Meta Ads)** e **Mercado Livre Afiliados**, eliminando o antigo módulo de disparos em massa frios (`bot-disparador`) para garantir estabilidade, leveza e alta velocidade.

- **Cockpit Unificado de Alta Performance** (`app/` + `web-cockpit` — Porta 3000):
  - **Replicador de Ofertas VIP**: Monitoramento de concorrentes, higienização de links, encurtador `meli.la`, download de fotos 2X HD e postagem automática.
  - **Mercado Livre Afiliados**: 7 visões analíticas oficiais (Produtos vendidos, Audiências demográficas e por estado, Vendas não efetivadas, Histórico diário, Vendas recentes, Categorias e Tags de rastreamento).
  - **Finanças & DRE Meta Ads**: Ingestão automática de gastos de anúncios e comissões do Mercado Livre, DRE consolidado, Regra dos 70/30 e Gerador de Relatórios Executivos Mensais.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Ambiente / Status | Descrição |
| :--- | :--- | :--- | :--- |
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (Tema Água 💧)** | Monitora grupos, intercepta concorrentes, encurta para `meli.la` e replica com foto 2X HD. |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo (Sentinel 45m)** | Monitorado pelo Cookie Sentinel em tempo real, encurtador oficial `https://meli.la/xxxxxx`. |
| **Meli Afiliados (7 Visões)** | API Interna de Afiliados + SQLite | 🟢 **Ativo (Sincronização 24/7)** | Ingestão automática com 7 abas: Produtos vendidos, Audiências, Vendas perdidas, Data, Vendas, Categorias e Tags. |
| **Super Cockpit Unificado (React 19)** | React 19 + Tailwind v4 + Recharts | 🟢 **Online (Header Glass Panel)** | Design em padrão de cartões enquadrados, botão de sincronização unificada automática e navegação direta. |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Named Volumes)** | `replica.db` salvo com segurança em `/app/data` com fuso horário canônico de Brasília (BRT / UTC-3). |
| **Finanças & Relatórios Executivos** | Fastify + Recharts + SQLite | 🟢 **Ativo (Conciliação Contábil)** | Consolidação automática das bases Meta Ads e Mercado Livre, DRE e emissão de relatórios mensais formatados. |
| **Google Planilhas ("produtos tcg valores")** | Webhook Apps Script + Dual-Write Local | 🟢 **Ativo (Sincronização Contínua)** | Registra automaticamente cada oferta enviada nos grupos com Data/Hora, Nome do Produto, Preço e Link. |
| **Mensagem Diária de Abertura (07:00 AM)** | Scheduler Nativo (Fuso de Brasília) | 🟢 **Ativo (Anti-Duplicidade)** | Dispara automaticamente mensagem calorosa todas as manhãs às 07:00 AM com rotação entre 4 modelos. |
| **Gerador de Anúncios Universal** | Fastify + Scraper ML & Shopee + OpenGraph | 🟢 **Ativo (Replicador)** | Suporta links do Mercado Livre, Shopee e lojas gerais com fallback anti-bot, edição de copy, cópia rápida e disparo para rotas ativas. |

---

## 3. URLs e Acessos em Produção (Nuvem)

* **Cockpit Unificado**:  
  👉 **`http://108.174.145.77:3000`** (Local: `http://localhost:3000`)
* **Painel de Gestão Coolify**:  
  👉 **`http://108.174.145.77:8000`**
* **Repositório GitHub Oficial**:  
  👉 `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`)

> [!NOTE]
> Credenciais padrão de acesso:  
> Usuário: **`admin`** | Senha: **`promo2026`** (Sessão segura de 30 dias via HMAC-SHA256).

---

## 4. Cobertura de Testes Automatizados

- **Total de Testes:** **98 testes unitários e de integração** (100% aprovados, 0 falhas).
  - Executável com um único comando na raiz do projeto: `npm test`.

---

## 5. Preparação para Novo Computador

O repositório está 100% pronto para ser clonado em outra máquina:
- **Guia passo a passo:** [GUIA_MIGRACAO_NOVO_PC.md](../GUIA_MIGRACAO_NOVO_PC.md)
- **Script Windows:** `setup-novo-pc.bat` (instala, compila e testa automaticamente)
- **Script Unix:** `setup-novo-pc.sh`
- **Modo Desenvolvimento:** `iniciar-dev.bat` / `iniciar-dev.sh` (com Hot Reload)
- **Encerramento de Portas:** `parar.bat` / `parar.sh` (mata processos nas portas 3000 e 3333)
