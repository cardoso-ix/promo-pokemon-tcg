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
  - **Suporte Mobile & PWA Nativo:** Compatível com instalação direta em smartphones (Android e iOS) via Progressive Web App (`manifest.json`), execução em tela cheia (`standalone`) e **Bottom Navigation Bar** inferior ergonômica para navegação com o polegar.
  - **Visão Geral 360°:** Dashboard executivo unificando fluxo horário com granularidade de **1 em 1 hora** (Cliques de Afiliados e Ofertas Replicadas) e **Planilha Horária Integrada**, investimento Meta Ads em tempo real, comissões do Mercado Livre, Blended ROAS e regra dos 70% de reinvestimento.
  - **Módulo Replicador (Água 💧):** Feed de ofertas ao vivo, rotas de transmissão com toggles rápidos, gerador de anúncios TCG com auto-extração de foto/preço e **re-afiliação obrigatória de links concorrentes (`meli.la` e `/sec/`)**, prévia em tempo real com auto-preenchimento, Sentinel do Mercado Livre e **Central de Ajustes Modular Completa** (coordenação de tags de comissão, regras anti-spam, filtros estritos TCG, higienização de assinaturas concorrentes, seletor visual e alternância entre 4 modelos de Mensagens de Bom Dia com rotação automática diária, prévia em tempo real e botão de teste de disparo, além de sincronização com Google Sheets).
  - **Módulo Meli Afiliados (Ouro 🛍️):** 7 visões analíticas completas replicando o portal oficial com catálogo visual imune a bloqueios (assets locais em SVG de alta definição, sanitização automática de URLs, `referrerPolicy` defensivo e fallback inteligente sem ícones quebrados).
  - **Módulo Finanças & DRE Executivo (Esmeralda 💼):** Dados 100% reais alimentados automaticamente via API do Meta Ads e Mercado Livre Afiliados, **Persistência SQLite dedicada de lançamentos diários** com resiliência a atrasos de consolidação da API do ML, edição/ajuste e exclusão direta pela tabela de lançamentos com 1 clique, **Filtros Rápidos de Período (Dia, Semana, Mês e Geral)** com recálculo reativo instantâneo de todos os KPIs, gráficos DRE dinâmicos, extrato diário auditado e **Gerador de Relatórios Executivos Mensais** com exportação CSV e impressão em PDF.
- **Performance:** Aplicação ultraleve após a desintegração do disparador de mensagens frias, concentrando 100% dos recursos em tráfego pago escalável (Meta Ads) e afiliados oficiais.

---

### 1. 🌊 Módulo Replicador de Ofertas & Central de Ajustes
- **Objetivo:** Monitora grupos de ofertas concorrentes 24/7, intercepta links de produtos, higieniza mensagens removendo assinaturas de terceiros, gera links de afiliados oficiais com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X HD e replica nos seus grupos VIP.
- **⚙️ Central de Ajustes & Coordenação:**
  - **Tags de Afiliado:** Controle instantâneo de `matt_word`, `matt_tool` e link da vitrine oficial.
  - **Regras de Postagem & Filtros Anti-Spam:** Toggles visuais para Filtro Exclusivo Pokémon TCG Copag, Somente Mercado Livre, Cooldown anti-duplicidade (minutos), Teto máximo de postagens por hora, Atraso máximo tolerável e Delay entre envios.
  - **Limpeza de Concorrentes:** Caixa multilinhas para raspar arrobas e menções indesejadas (ex: `@rasgabooster.tcg`, `#rasgaboot`).
  - **🌅 Mensagem Diária de Abertura & Seletor de Modelos:**
    - Alternância visual instantânea entre os 4 templates profissionais + Modo **Rotação Automática Diária** + Modo **Mensagem Personalizada**.
    - Suporte a personalização de texto livre com interpolação dinâmica de `{dia_semana}`.
    - **Isolamento de Polling (`configDirty`):** Previne qualquer reversão involuntária da mensagem selecionada ao editar na aba de Ajustes.
    - **Auto-Save Inteligente:** Ao clicar em *"Testar Envio Agora"*, o sistema salva automaticamente o modelo selecionado no banco de dados antes do disparo, garantindo que o WhatsApp receba exatamente a mensagem ativa.
    - Botão dedicado **"Salvar Este Modelo"** diretamente no card para persistência instantânea.
    - Prévia ao vivo com balão autêntico de WhatsApp iniciando no topo sem cortes descompensados.
  - **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script.
  - **📈 Base de Preços TCG & Motor Canônico Inteligente (Planilha Nativa Integrada):**
    - **Deduplicação Canônica Automática:** Motor TCG que identifica o formato (*Booster Box*, *ETB*, *Blister Triplo*, *Blister Quádruplo*, *Lata*, *Deck*, *Fichário*) e a expansão oficial (*Escuridão Absoluta/ME05*, *Evoluções Prismáticas/SV8.5*, *Faíscas Volumosas*, *Coroa Estelar*, *151*, *30 Anos*, etc.).
    - **Unificação de Variações de Vendedores:** Agrupa títulos diferentes para o mesmo produto em uma **única linha canônica** no SQLite (`chave_canonica`), eliminando dezenas de duplicidades redundantes.
    - **Métricas Consolidadas:** Identifica o **Menor Preço Real 🟢 (mínimo histórico consolidado)** e **Maior Preço Real 🔴 (teto histórico)** entre todas as postagens combinadas, preço médio e soma de ocorrências.
    - **Radar de Precificação Canônico no Gerador de Anúncios:** Balizador instantâneo que busca primeiro pela chave canônica do produto, permitindo sugerir na hora o preço ideal e menor valor já postado para guiar novas ofertas manuais.
    - Extrato cronológico detalhado com linha do tempo de todas as postagens unificadas daquele produto e sincronização retroativa inteligente.
- **⚡ Gerador de Anúncios Universal:** Interface no painel para colar links do Mercado Livre, Shopee ou lojas gerais, com parser OpenGraph resiliente, extração automática de foto HD, detecção De/Por, cupons, radar de precificação canônica integrada, edição em tempo real da copy, cópia rápida para área de transferência e disparo automático com auto-destinos para todas as rotas ativas.
- **🔄 Botão de Sincronização Unificada:** Sincronização instantânea das métricas do Meta Ads (Graph API v20.0) e Mercado Livre Afiliados com recálculo em tempo real de ROAS, comissões do dia e lucro líquido.

---

### 2. 🛍️ Módulo Mercado Livre Afiliados (7 Visões Analíticas Oficiais)
- **Ingestão Oficial da API de Afiliados:** Conexão nativa e contínua com a API do Programa de Afiliados do Mercado Livre (`/affiliate-program/api/dashboard/*`).
- **Resolução de Imagens Defensiva:**
  - Sanitização de URLs antigas ou links bloqueados de CDN externa, substituindo por SVGs de alta definição gerados localmente.
  - Renderização protegida no frontend com fallback elegante via badges temáticos (`Package` / `ShoppingBag`), garantindo ausência de ícones cinzas quebrados em qualquer aba.
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
- **Auto-Sync Periódico & Midnight Watcher (00:00 BRT):** Sincronização contínua em background da API oficial do Mercado Livre a cada 20 minutos e monitor a cada 30s que reseta pontualmente às 00:00:00 de Brasília comissões, vendas e pedidos de hoje para R$ 0,00, espelhando fielmente o portal do Mercado Livre.
- **Isolamento Temporal Estrito & Soberania Contábil:** O cache analítico do Mercado Livre isola as métricas diárias (`commissionsToday`, `ordersToday`, `totalSalesToday`, `clicksToday`), blindando contra vazamento de datas anteriores quando a sessão expirar, e estabelece precedência soberana de lançamentos manuais no DRE.
- **Filtros Rápidos de Período (Dia / Semana / Mês / Todos):**
  - Botão **Dia** com seletor de data específica.
  - Botão **Semana** consolidando os últimos 7 dias.
  - Botão **Mês Completo** alinhado ao seletor de mês de referência.
  - Recálculo reativo instantâneo de todos os 4 cards de KPIs, do gráfico DRE e do extrato diário.
- **DRE Automático Consolidado:**
  - Lucro Líquido Real = Comissões Confirmadas Mercado Livre - Investimento Meta Ads.
  - Regra dos 70/30: 70% reservado para reinvestimento em novas campanhas de tráfego pago e 30% disponível para retirada dos sócios.
- **Gerador de Relatório Executivo Mensal:**
  - Botão institucional no painel para consolidar qualquer mês arquivado.
  - Grade executiva com os 6 KPIs principais, governança da regra 70/30 e extrato diário auditado.
  - Botões dedicados para **Imprimir / Exportar PDF** (`window.print()`) e **Exportar CSV**.

---

## 🎨 Design System Unificado
- **Tipografia:** `Outfit` (títulos e headings), `Inter` (corpo e formulários) e `Fira Code` (dados técnicos).
- **Glassmorphism de Alta Proteção:** Cards, modais e cabeçalhos com `backdrop-filter: blur(16px)` garantindo 100% de nitidez e legibilidade sobre os efeitos de fundo.
- **Credenciais Padrão:** Usuário: `admin` | Senha: `promo2026` (Sessão criptografada HMAC válida por 30 dias).

---

## 🧪 Cobertura de Testes Automatizados (102 Testes — 100% Verde)

A plataforma conta com uma suíte de testes unitários e de integração abrangente em `app/test/`:

| Módulo | Qtd Testes | Foco de Validação | Status |
| :--- | :---: | :--- | :---: |
| **Pipeline & Normalização** | 30 | Extração de preços De/Por, remoção de assinaturas concorrentes, formatação limpa e encurtamento `meli.la` | 🟢 Passou (100%) |
| **Guardião TCG & Anti-Spam** | 18 | Filtro estrito de nicho (Pokémon TCG), cooldown de 30 min por produto e bloqueio de lixo | 🟢 Passou (100%) |
| **Parser de Imagens & Mídia** | 12 | Baixa automática de fotos HD oficiais do Mercado Livre, fallback gracioso e integridade | 🟢 Passou (100%) |
| **Gerador & Extrator de Anúncios** | 14 | Extração De/Por/Cupom em links Mercado Livre e Shopee, cópia e disparo em lote com auto-destinos | 🟢 Passou (100%) |
| **Agendador Diário, Bom Dia & Métricas** | 10 | Disparo às 07:00, interpolação, rotação de 4 templates e contagem real de hoje via SQL indexado | 🟢 Passou (100%) |
| **Google Planilhas Webhook** | 6 | Conexão resiliente, formatação de valores em BRL e envio assíncrono não-bloqueante | 🟢 Passou (100%) |
| **Autenticação & Sessão HMAC** | 12 | Login seguro, tokens HMAC e reset diário atômico de comissões na virada de meia-noite | 🟢 Passou (100%) |
| **Total Consolidado** | **102 testes** | **Zero falhas na esteira de automação** | 🟢 **100% VERDE** |

Para executar todos os testes da raiz:
```bash
npm test
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
