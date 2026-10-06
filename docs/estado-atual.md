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
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (Tema Água 💧)** | Monitora grupos, intercepta concorrentes (Mercado Livre e Amazon), injeta afiliados e replica com foto 2X HD. |
| **Amazon Associados** | Motor Canônico ASIN + Injeção de Tag | 🟢 **Ativo (Store ID: tcgpokepromo-20)** | Intercepta `amzn.to` e `amazon.com.br`, injeta tag oficial limpa, raspa foto HD e replica no nicho TCG. |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo (Sentinel 45m)** | Monitorado pelo Cookie Sentinel em tempo real, encurtador oficial `https://meli.la/xxxxxx`. |
| **Meli Afiliados (7 Visões)** | API Interna de Afiliados + SQLite | 🟢 **Ativo (Sincronização 24/7)** | Ingestão automática com 7 abas: Produtos vendidos, Audiências, Vendas perdidas, Data, Vendas, Categorias e Tags. |
| **Super Cockpit Unificado (React 19)** | React 19 + Tailwind v4 + Recharts | 🟢 **Online (Header Glass Panel)** | Design em padrão de cartões enquadrados, botão de sincronização unificada automática e navegação direta. |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Named Volumes)** | `replica.db` salvo com segurança em `/app/data` com fuso horário canônico de Brasília (BRT / UTC-3). |
| **Finanças & Relatórios Executivos** | Fastify + Recharts + SQLite | 🟢 **Ativo (Conciliação Contábil)** | Consolidação automática das bases Meta Ads e Mercado Livre, DRE e emissão de relatórios mensais formatados. |
| **Caixa & Recargas Meta Ads** | Graph API v20.0 + SQLite Híbrido | 🟢 **Ativo (Tempo Real)** | Exibição do saldo de caixa para anúncios no Cockpit, badges de status, recargas manuais e limites de alerta. |
| **Google Planilhas ("produtos tcg valores")** | Webhook Apps Script + Dual-Write Local | 🟢 **Ativo (Sincronização Contínua)** | Registra automaticamente cada oferta enviada nos grupos com Data/Hora, Nome do Produto, Preço e Link. |
| **Mensagem Diária de Abertura (07:00 AM)** | Scheduler Nativo (Fuso de Brasília) | 🟢 **Ativo (Anti-Duplicidade)** | Dispara automaticamente mensagem calorosa todas as manhãs às 07:00 AM com rotação entre 4 modelos. |
| **Gerador de Anúncios Universal** | Fastify + Scraper ML, Amazon & Shopee | 🟢 **Ativo (Replicador)** | Suporta links do Mercado Livre, Amazon e Shopee com foto HD, edição de copy, cópia rápida e disparo para rotas ativas. |

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

- **Total de Testes:** **156 testes unitários e de integração** (100% aprovados, 0 falhas).
  - `app` (Replicador, Guardião TCG, Radar, Meta Ads e Amazon Associados): **156 testes aprovados** (Guardião TCG expandido, parcelamento sem juros higienizado, fotos 2X HD, vitrine social, extrator de leads Meta e motor canônico Amazon).
- Executável com um único comando na raiz do projeto: `npm test`.

### 4.1. Suporte Multi-Marketplace: Amazon Associados (Outubro/2026)
- **Motor Canônico ASIN:** Detecção de `amazon.com.br`, `amazon.com`, `amzn.to` e `a.co`, extração do código do produto (ASIN) e montagem de URLs canônicas ultrarrápidas (`https://www.amazon.com.br/dp/ASIN?tag=tcgpokepromo-20`).
- **Limpeza de Parâmetros Concorrentes:** Higienização total de tags alheias (`tag`, `linkCode`, `ref_`, `creative`) garantindo atribuição limpa das comissões.
- **Download de Fotos HD:** Captura automática de imagens em alta resolução dos servidores oficiais da Amazon (`m.media-amazon.com`).
- **Cockpit Integrado:** Configuração da tag no painel e toggle individual para ativar/desativar a replicação da Amazon em tempo real.

### 4.2. Melhorias Recentes de Performance e Radar TCG (Opção 1)
- **Guardião TCG Expandido:** Mais de 35 novos termos e Pokémons icônicos mapeados (Greninja, Sylveon, Umbreon, Rayquaza, Mew, Coleção 30 Anos, Celebrações, etc.), eliminando falsos descartes por `fora_nicho_tcg`.
- **Higienização de Parcelamento:** Cálculo unitário preciso de parcelas sem placeholders brutos do ML (`{o} {price_total} {en}`) e remoção de "sem juros" duplicado.
- **Miniaturas HD no Feed ao Vivo:** Renderização nativa da foto real do produto no card de atividade do WhatsApp no Cockpit, com suporte a visualização ampliada ao clicar e badge `2X HD`.
- **Rota Multi-Grupo Oficial:** Monitoramento simultâneo de todos os 9 grupos de TCG para não perder nenhuma oferta enviada em tempo real.

### 4.2. Estratégia de Tráfego Pago & Meta Ads (Outubro/2026)
- **Extrator Nativo de Contatos WhatsApp:** Ferramenta integrada ao Cockpit para extrair e higienizar contatos de todos os grupos de Pokémon TCG para exportação compatível com o Meta Ads (padrão SHA-256 internacional).
- **Lista de Clientes Qualificada:** Base de 4.278 membros reais e ativos de grupos de Pokémon TCG carregada como Custom Audience no Meta Ads (`act_248381968679040`).
- **Lookalike 1% Brasil:** Cluster algorítmico do 1% mais semelhante no Brasil (~1,7 milhão de pessoas) gerado a partir da base dos 4.278 membros para tração de alta afinidade e retenção.
- **Estrutura Dual-Campaign (R$ 50,00/dia):**
  - **Campanha Lookalike 1% (Nova - 05/10/2026):** R$ 30,00/dia alocados em conjunto exclusivo mobile (Feeds, Stories, Reels) com otimização para evento `LEAD`.
  - **Campanha Base Aberta (29/09/2026):** R$ 20,00/dia mantidos para sustentação do pixel e descoberta contínua.
- **Métrica Marco Zero (Baseline):**
  - **Data e Hora de Início:** 05/10/2026 às 19:44 (Horário de Brasília)
  - **Membros Iniciais no Grupo:** **310 membros** (registrado na tabela `configs` do SQLite).
  - **Meta de Crescimento Líquido:** Monitorar entradas reais subtraindo eventuais saídas a partir dessa marca.
- **Manual do Garimpeiro TCG:**
  - Criado o guia completo de garimpo e cálculo de preço por booster em [`docs/GUIA_GARIMPO_MERCADO_LIVRE_TCG.md`](./GUIA_GARIMPO_MERCADO_LIVRE_TCG.md).




---

## 5. Preparação para Novo Computador

O repositório está 100% pronto para ser clonado em outra máquina:
- **Guia passo a passo:** [GUIA_MIGRACAO_NOVO_PC.md](../GUIA_MIGRACAO_NOVO_PC.md)
- **Script Windows:** `setup-novo-pc.bat` (instala, compila e testa automaticamente)
- **Script Unix:** `setup-novo-pc.sh`
- **Modo Desenvolvimento:** `iniciar-dev.bat` / `iniciar-dev.sh` (com Hot Reload)
- **Encerramento de Portas:** `parar.bat` / `parar.sh` (mata processos nas portas 3000 e 3333)


### 1.5. Base de Preços TCG & Motor Canônico Inteligente
- **Status:** 🟢 Ativo em Produção (SQLite `historico_produtos_valores`).
- **Motor Canônico:** Deduplica automaticamente centenas de variações de títulos de vendedores para o mesmo produto, agrupando por formato (Booster Box, ETB, Blister Triplo, etc.) e coleção (Escuridão Absoluta, Evoluções Prismáticas, 151, 30 Anos, etc.) gerando chaves canônicas determinísticas (`chave_canonica`).
- **Radar de Precificação Integrado:** Ao colar um link ou copy no Gerador de Anúncios, o sistema busca a chave canônica e baliza instantaneamente o menor e maior preço já praticado para evitar ofertas fora da curva.
- **Mensagem Diária de Bom Dia:** Protegida contra sobrescrita com isolamento de polling (`configDirty`), suporte completo a modelo personalizado (`custom`), auto-save antes do teste e botão dedicado no card.
