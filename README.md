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
- **Arquitetura Moderna & Leve (SPA Nativa sem Iframes):**
  - **Stack Visual de Ponta:** Desenvolvido em **React 19, Tailwind CSS v4, Recharts e Lucide Icons**.
  - **Visão Geral 360°:** Dashboard executivo unificando fluxo horário, investimento Meta Ads em tempo real, comissões do Mercado Livre, Blended ROAS e regra dos 70% de reinvestimento.
  - **Módulo Replicador (Água 💧):** Feed de ofertas ao vivo, rotas de transmissão com toggles rápidos, gerador de anúncios TCG com prévia em tempo real e Sentinel do Mercado Livre.
  - **Módulo Meli Afiliados (Ouro 🛍️):** 7 visões analíticas completas replicando o portal oficial (Produtos vendidos, Audiências demográficas e por estado, Vendas não efetivadas, Histórico diário, Vendas recentes, Categorias e Tags de rastreamento).
  - **Módulo Finanças & DRE Executivo (Esmeralda 💼):** Dados 100% reais alimentados automaticamente do Meta Ads e Mercado Livre, Balanço DRE consolidado, cálculo matemático da Regra dos 70% de Reinvestimento, gestão de faturas PDF e **Gerador de Relatórios Executivos Mensais** com exportação CSV e impressão em PDF.
- **Performance:** Aplicação ultraleve após a desintegração do disparador de mensagens frias, concentrando 100% dos recursos em tráfego pago escalável (Meta Ads) e afiliados oficiais.

---

### 1. 🌊 Módulo Replicador de Ofertas
- **Objetivo:** Monitora grupos de ofertas concorrentes 24/7, intercepta links de produtos, higieniza mensagens removendo assinaturas de terceiros, gera links de afiliados oficiais com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X HD e replica nos seus grupos VIP.
- **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script.
- **🌅 Mensagem Diária de Abertura (07:00 AM):** Posta automaticamente todas as manhãs no horário oficial de Brasília uma mensagem de boas-vindas e engajamento nos grupos de destino ativos com rotação de 4 templates selecionados a dedo.
- **⚡ Gerador de Anúncios Universal:** Interface no painel para colar links do Mercado Livre, Shopee ou lojas gerais, com parser OpenGraph resiliente, extração automática de foto HD, detecção De/Por, cupons, edição em tempo real da copy, cópia rápida para área de transferência e disparo automático com auto-destinos para todas as rotas ativas.
- **🔄 Botão de Sincronização Unificada:** Sincronização instantânea das métricas do Meta Ads (Graph API v20.0) e Mercado Livre Afiliados com recálculo em tempo real de ROAS, comissões do dia e lucro líquido.

---

### 2. 🛍️ Módulo Mercado Livre Afiliados (7 Visões Analíticas Oficiais)
- **Ingestão Oficial da API de Afiliados:** Conexão nativa e contínua com a API do Programa de Afiliados do Mercado Livre (`/affiliate-program/api/dashboard/*`).
- **As 7 Visões Analíticas:**
  1. **Produtos Vendidos:** Tabela detalhada de itens comissionados, faturamento gerado, comissão ganha e links diretos.
  2. **Audiências:** Perfil demográfico completo dos compradores (Faixa etária, Gênero e Distribuição geográfica por estados brasileiros).
  3. **Vendas Não Efetivadas:** Análise de carrinho abandonado, pedidos cancelados e motivos de perda.
  4. **Data:** Histórico dia a dia de receita, comissões, pedidos e taxa de conversão (CVR).
  5. **Vendas:** Extrato cronológico detalhado das últimas vendas com status e comissão unitária.
  6. **Categorias:** Gráfico comparativo e ranking das categorias mais lucrativas (Brinquedos, Colecionáveis, etc.).
  7. **Etiquetas de Rastreamento:** Monitoramento de campanhas segmentadas pela tag de atribuição oficial (`matt_word` / `matt_tool`).

---

### 3. 💼 Módulo de Finanças & Relatórios Executivos
- **Sincronização Direta Meta Ads (Graph API v20.0):** Ingestão automática de gastos (`spend`), impressões, cliques, compras, CPC e CTR direto da conta de anúncios.
- **DRE Automático Consolidado:**
  - Lucro Líquido Real = Comissões Confirmadas Mercado Livre - Investimento Meta Ads.
  - Regra dos 70/30: 70% reservado para reinvestimento em novas campanhas de tráfego pago e 30% disponível para retirada dos sócios.
- **Gerador de Relatório Executivo Mensal:**
  - Botão institucional no painel para consolidar qualquer mês arquivado.
  - Grade executiva com os 6 KPIs principais, governança da regra 70/30 e extrato diário auditado.
  - Botões dedicados para **Imprimir / Exportar PDF** (`window.print()`) e **Exportar CSV**.
- **Gestão de Comprovantes & Faturas PDF:** Upload e arquivamento seguro de recibos oficiais do Meta Ads.

---

## 🎨 Design System Unificado
- **Tipografia:** `Outfit` (títulos e headings), `Inter` (corpo e formulários) e `Fira Code` (dados técnicos).
- **Glassmorphism de Alta Proteção:** Cards, modais e cabeçalhos com `backdrop-filter: blur(16px)` garantindo 100% de nitidez e legibilidade sobre os efeitos de fundo.
- **Credenciais Padrão:** Usuário: `admin` | Senha: `promo2026` (Sessão criptografada HMAC válida por 30 dias).

---

## 🧪 Cobertura de Testes Automatizados (96 Testes — 100% Verde)

A plataforma conta com uma suíte de testes unitários e de integração abrangente em `app/test/`:

| Módulo | Qtd Testes | Foco de Validação | Status |
| :--- | :--- | :--- | :--- |
| **Replicador & Analytics (`app/`)** | **96 testes** | Desduplicação cross-group, parsing de preços/cupons, extração de anúncios ML, nicho TCG, rotação 07:00 AM, ponte interna, ingestão analítica e AES-256 | 🟢 100% Aprovado |
| **Total do Projeto** | **96 testes** | **Zero falhas no sistema consolidado** | 🟢 **100% VERDE** |

Para executar todos os testes da raiz:
```bash
npm test
```
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
