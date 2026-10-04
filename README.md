# ⚡ Promo Pokémon TCG — Plataforma Completa de Automação (Nuvem 24/7)

Ecossistema profissional em **Node.js 22 LTS e TypeScript** para automação de vendas, promoções, captação de clientes, tráfego pago, inteligência artificial e atendimento inteligente de **Pokémon TCG** no WhatsApp.

A plataforma opera **100% online na nuvem em VPS própria (HostGator) gerenciada pelo Coolify** com persistência contínua em Named Volumes NVMe, acessível de qualquer dispositivo (computador, tablet ou smartphone) sem depender de máquina local ligada.

---

## 🚀 Migração para Novo Computador (Setup em 3 Minutos)

Se você acabou de abrir este projeto em um novo computador ou notebook para continuar as melhorias:

👉 **Consulte o manual rápido:** [GUIA_MIGRACAO_NOVO_PC.md](GUIA_MIGRACAO_NOVO_PC.md) | **Auditoria Técnica:** [AUDITORIA_SISTEMA_OUTUBRO_2026.md](AUDITORIA_SISTEMA_OUTUBRO_2026.md)

### No Windows:
1. Instale o **Node.js v20 LTS ou v22 LTS** ([nodejs.org](https://nodejs.org/)).
2. Dê dois cliques no script **`setup-novo-pc.bat`**.  
   *(Ele instala todas as dependências, cria o `.env`, compila o código e roda os 134 testes).*
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

### ⚡ Dashboard Pokémon TCG (`web-cockpit` + `app/` — Porta 3000)
- **Status:** 🟢 **Online 24/7 (VPS HostGator + Coolify)**
- **Painel em Produção:** 👉 **`http://108.174.145.77:3000`** | **Local:** 👉 **`http://localhost:3000`**
- **Arquitetura Moderna & Leve (SPA Nativa sem Iframes):**
  - **Stack Visual de Ponta:** Desenvolvido em **React 19, Tailwind CSS v4, Recharts e Lucide Icons** com estética Pokémon TCG Pro.
  - **Suporte Mobile & PWA Nativo:** Compatível com instalação direta em smartphones (Android e iOS) via Progressive Web App (`manifest.json`), execução em tela cheia (`standalone`) e **Bottom Navigation Bar** inferior ergonômica para navegação com o polegar.
  - **Visão Geral 360°:** Dashboard executivo unificando fluxo horário com granularidade de **1 em 1 hora** (Cliques de Afiliados e Ofertas Replicadas) e **Planilha Horária Integrada**, caixa de investimento Meta Ads 100% automatizada direto da Graph API v20.0, comissões do Mercado Livre, Blended ROAS e regra dos 70% de reinvestimento.
  - **Módulo Replicador (Água 💧):** Feed de ofertas ao vivo, rotas de transmissão com toggles rápidos, gerador de anúncios TCG com auto-extração de foto/preço e **re-afiliação obrigatória de links concorrentes (`meli.la` e `/sec/`)**, prévia em tempo real com auto-preenchimento, Sentinel do Mercado Livre e **Central de Ajustes Modular Completa** (coordenação de tags de comissão, regras anti-spam, filtros estritos TCG, higienização de assinaturas concorrentes, seletor visual e alternância entre modelos de Mensagens de Bom Dia, além de sincronização com Google Sheets).
  - **Módulo Radar de Preços TCG (Personal Shopper PRO 🎯):** Monitor de cotação em tempo real com mini-cards compactos e modo alternável para **Tabela de Cotação Dinâmica**, fotos reais oficiais do Mercado Livre CDN em WebP, descrições comerciais padronizadas (`[CATEGORIA] • NOME • PREÇO • VENDEDOR`) e filtros de precisão por Categoria e Faixas de Preço.
  - **Módulo Meli Afiliados (Ouro 🛍️):** 7 visões analíticas completas replicando o portal oficial com catálogo visual imune a bloqueios (assets em WebP/alta definição, sanitização automática de URLs, `referrerPolicy` defensivo e fallback inteligente sem ícones quebrados).
  - **Módulo Finanças & DRE Executivo (Esmeralda 💼):** Dados 100% reais alimentados automaticamente via API do Meta Ads e Mercado Livre Afiliados, **Persistência SQLite dedicada de lançamentos diários**, edição/ajuste e exclusão direta pela tabela de lançamentos, **Filtros Rápidos de Período (Dia, Semana, Mês e Geral)** com recálculo reativo instantâneo de todos os KPIs, gráficos DRE dinâmicos, extrato diário auditado e **Gerador de Relatórios Executivos Mensais com Impressão A4 Profissional e Cópia Universal para WhatsApp**.
  - **Design System Magic Patterns AI (Padrão Estético Premium & Mobile First):**
    - **Integração MCP & API REST:** Conectado diretamente ao servidor oficial do **Magic Patterns** via protocolo Model Context Protocol (Streamable HTTP) e bridge em TypeScript (`magic-patterns.service.ts`).
    - **Design Tokens Exclusivos:** Implementados utilitários visuais de alta fidelidade no Tailwind CSS (`.mp-card`, `.mp-card-cyan`, `.mp-card-violet`, `.mp-card-emerald`, `.mp-card-amber`, `.mp-metric-value`) com vidro fosco (glassmorphism), bordas luminosas sutis, indicadores de tendência e números tabulares (`tnum`).
    - **Experiência Mobile de Primeira Classe:** Layout 100% responsivo com quebra harmônica de cards de KPIs para smartphones, tipografia fluida, toque seguro (`safe-area-inset-bottom`) e navegação inferior ergonômica (`BottomNav.tsx`) com micro-indicador de rota ativa.
    - **Diretriz Mandatória na Skill Mestre (`master-engineering`):** Regra automatizada de desenvolvimento onde qualquer criação ou refatoração de frontend aciona previamente o Magic Patterns para obter a melhor direção estética antes da codificação final.
- **Performance:** Aplicação ultraleve concentrando 100% dos recursos em tráfego pago escalável (Meta Ads) e afiliados oficiais.

---

### 1. 🌊 Módulo Replicador de Ofertas & Central de Ajustes
- **Objetivo:** Monitora grupos de ofertas concorrentes 24/7, intercepta links de produtos, higieniza mensagens removendo assinaturas de terceiros, gera links de afiliados oficiais com encurtamento `meli.la`, preserva/baixa fotos oficiais em 2X HD e replica nos seus grupos VIP.
- **Centralização Inteligente:** Base de preços unificada com o Radar TCG para eliminar redundâncias e focar na rápida geração e replicação de ofertas.
- **⚙️ Central de Ajustes & Coordenação:**
  - **Tags de Afiliado:** Controle instantâneo de `matt_word`, `matt_tool` e link da vitrine oficial.
  - **Regras de Postagem & Filtros Anti-Spam:** Toggles visuais para Filtro Exclusivo Pokémon TCG Copag, Somente Mercado Livre, Cooldown anti-duplicidade (minutos), Teto máximo de postagens por hora, Atraso máximo tolerável e Delay entre envios.
  - **Limpeza de Concorrentes:** Caixa multilinhas para raspar arrobas e menções indesejadas (ex: `@rasgabooster.tcg`, `#rasgaboot`).
  - **🌅 Mensagem Diária de Abertura:** Templates profissionais com rotação automática diária e suporte a texto livre.
  - **📊 Google Planilhas Integrado:** Registra automaticamente cada oferta enviada nos grupos na planilha **"produtos tcg valores"** com Data/Hora, Nome do Produto, Preço Promocional (Por), Preço Original (De) e Link Afiliado via Webhook Google Apps Script.
- **⚡ Gerador de Anúncios Universal:** Interface no painel para colar links do Mercado Livre ou lojas gerais, com parser OpenGraph resiliente, extração automática de foto HD, detecção De/Por, cupons, radar de precificação integrado, edição em tempo real da copy, cópia rápida para área de transferência e disparo automático com auto-destinos para todas as rotas ativas.
- **🎟️ Foto Oficial Amarela & Vitrine Obrigatória em Cupons Mercado Livre:** Tratamento visual e de afiliação inteligente para comunicados e listas de cupons:
  - **Foto Amarela Oficial Incondicional:** Em qualquer comunicado de novos cupons ou lista promocional, o robô anexa obrigatoriamente a foto oficial amarela do Mercado Livre (`cupom-mercadolivre.png`), preservando a sua proporção nativa de banner sem cortes.
  - **Vitrine Oficial Garantida:** Todos os links de cupons e campanhas gerais são convertidos estritamente para a vitrine oficial de ofertas do Eduardo (`https://mercadolivre.com/sec/2rM6RPm`), impedindo buscas falsas e links alheios de concorrentes.
  - **Descarte de Tetos e Mínimos como Preço:** Condições de cupom (ex: *"limitado a R$ 100"*, *"compras acima de R$ 79"*, *"mínimo de R$ 50"*) são 100% filtradas e nunca viram título nem preço de produto.
- **🖼️ Padronização Vitrine de Estúdio (Canvas 1:1, Respiro Proporcional & LRU Cache):** Processamento inteligente de imagem com motor gráfico `sharp`. Centraliza qualquer foto de produto em um canvas quadrado perfeito de 1080x1080 px com fundo branco de catálogo e margem de respiro proporcional (padding configurável de 8%, 12% ou 18%), eliminando o efeito de fotos sufocadas ou coladas nas bordas no WhatsApp. Conta com **LRU Cache de memória RAM** de alta performance que armazena as últimas 80 imagens tratadas por 30 minutos, retornando ofertas repetidas em **0 milissegundos** sem reprocessamento de CPU.
- **🧹 Auto-Purga Programada de Logs (> 90 dias):** Rotina automática integrada ao banco de dados SQLite que expurga logs antigos e duplicatas de mais de 90 dias a cada 24 horas, mantendo a base de dados leve (< 10 MB) e com respostas instantâneas perpetuamente.
- **🚨 Sentinela Proativo de Cookie no WhatsApp Privado:** Monitor contínuo a cada 45 minutos que verifica a saúde da sessão do encurtador `meli.la`. Caso o cookie do Mercado Livre expire, o robô dispara automaticamente um alerta privado no WhatsApp do administrador com as orientações de renovação e trava anti-spam de cooldown de 12 horas, garantindo que o operador nunca seja pego de surpresa.
- **🖥️ Super Cockpit Pro Expandido (`max-w-[1680px]`):** Layout de alta resolução otimizado para monitores Full HD (1920x1080) e Ultra-Wide. O container principal foi expandido de 1280px (`max-w-7xl`) para 1680px (`max-w-[1680px]`), preenchendo a tela com harmonia e proporcionando o mesmo espaço amplo e generoso para todas as abas (Dashboard, Afiliados, Replicador, Radar, Finanças e Central de Ajustes).
- **🛡️ Blindagem de Produtos Esgotados / Pausados no Mercado Livre:** Detecção inteligente de estoque esgotado ou anúncios pausados (`isAnuncioEsgotadoOuPausado`). Quando um anúncio esgota no Mercado Livre, a plataforma exibe carrosséis de produtos alternativos ou redireciona para vitrines (`/sec/`). O motor agora bloqueia a captura de preços desses carrosséis secundários (ex: R$ 8 de sleeves ou R$ 30 de fichários), preserva integralmente o preço original informado no anúncio postado e redireciona os botões de compra e "Ver no ML" para a busca ativa de produtos com estoque em tempo real ordenados por menor preço (`_OrderId_PRICE_ASC`).
- **✨ Estúdio IA de Polimento & Redação (DeepSeek v4.1 + OpenCode Gateway + Fallback 0ms):**
  - **Fidelidade Total ao Texto Digitado (Sem Frases de Efeito):** O operador digita qualquer frase, recado ou aviso rápido (ex: *CORRE PARA APROVEITAR*). O motor higieniza a pontuação e gramática preservando estritamente as palavras originais, sem inventar bordões ou frases promocionais artificiais.
  - **5 Opções Padronizadas com Emojis Temáticos:** Gera automaticamente 5 variações com conjuntos de emojis profissionais prontos para WhatsApp:
    1. 🚨 *Alerta & Velocidade* (`🚨 ... ⚡`)
    2. 🔥 *Fogo & Estoque* (`🔥 ... 📦`)
    3. 🎯 *Mira & Destaque* (`🎯 ... ✨`)
    4. 🛒 *Carrinho & Ação* (`🛒 ... 🚀`)
    5. ⚡ *Raio Dinâmico* (`⚡ ... 🔥✨`)
  - **Disparo Direto & 1-Toque Mobile:** Cada uma das 5 opções conta com balão WhatsApp editável, botão de cópia instantânea e botão de envio em 1 toque para todos os grupos ativos.
  - **Arquitetura Resiliente com Fallback Local de 0ms:** Mecanismo local determinístico de 0ms que garante as 5 opções padronizadas instantaneamente mesmo em caso de oscilação na API externa.
- **🔄 Botão de Sincronização Unificada:** Sincronização instantânea das métricas do Meta Ads (Graph API v20.0) e Mercado Livre Afiliados com recálculo em tempo real de ROAS, comissões do dia e lucro líquido.

---

### 2. 🎯 Radar de Preços TCG (Personal Shopper & Monitor de Ofertas)
- **Engine Híbrido de Alta Performance (< 20ms):**
  - Motor de busca multicamadas que combina o histórico consolidado do banco de dados SQLite com um **Catálogo Canônico Oficial de Produtos Pokémon TCG** com fotos reais em WebP do Mercado Livre CDN (*Poster Box 30 Anos*, *Display Booster Box 360*, *ETB Destinos de Paldea*, *Fichário 30 Anos*, *Box Charizard ex*, *Blisters*, etc.).
  - Filtro semântico estrito com pontuação por relevância que prioriza correspondências exatas de expansões e produtos, eliminando falsos positivos.
- **Visualização Flexível (Cards Compactos & Tabela de Cotação):**
  - **Cards Compactos & Densos:** Miniaturas 84x84 com descrição padronizada `[CATEGORIA] • NOME • PREÇO • VENDEDOR`, badges rápidos de envio Full, Frete Grátis e Desconto (%).
  - **Filtros Avançados & Faixa de Preço Flexível (Min & Max):** Filtro por Categoria (*Booster Box*, *ETB*, *Box Especial*, *Blister*, *Fichário & Álbum*, *Poster Box*), inputs numéricos para definir faixa personalizada livre (`De R$ [Min]` até `Até R$ [Max]`) e 7 badges rápidos de 1 clique (*Até R$ 30*, *R$ 30 a R$ 80*, *R$ 80 a R$ 150*, *R$ 150 a R$ 250*, *R$ 250 a R$ 400*, *Acima de R$ 400*) com botão para limpar filtros instantaneamente.
- **Personal Shopper 1-a-1 & Disparo para Grupos (com Link Curto & Botão Ver no ML Preciso):**
  - **Copy Consultivo para WhatsApp Privado (1-a-1):** Mensagens personalizadas e educadas com procedência, parcelamento sem juros e **link curto oficial do Mercado Livre** (`mercadolivre.com/sec/2rM6RPm` ou `meli.la`), eliminando URLs longas e feias cheias de parâmetros técnicos.
  - **Copy Promocional para Grupo:** Formato oficial limpo com badges de destaque (⚡ FULL, 🚚 FRETE GRÁTIS), selo Copag lacrado e link curto oficial para WhatsApp.
  - **Ação Rápida de Copiar Link Curto:** Botão dedicado em 1 clique tanto nos cards quanto na tabela de cotação para copiar instantaneamente apenas o link curto do Mercado Livre.
  - **Ingestão Ativa & Registro Automático de Cotações:** Todas as buscas efetuadas no Radar de Preços (via API oficial do Mercado Livre ou inspeção direta de URLs) são automaticamente sanitizadas e salvas na tabela de histórico de cotações (`historico_produtos_valores`), mantendo os preços reais de mercado sempre atualizados com data, menor valor histórico e fotos em HD.
  - **Auto-Sync com Envios do Replicador:** Cada oferta enviada pelo bot nos grupos do WhatsApp é interceptada com sucesso, limpa de mensagens de clickbait e registrada automaticamente na base histórica com origem auditada (`robo_envio`).
  - **Ação Rápida de Salvar Cotação & Recalibrar Base:** Botão de 1 clique "Cotação" nos cards e na tabela para registrar ou atualizar qualquer produto sob demanda, além do botão "Recalibrar Base" no cabeçalho para purgar registros antigos incorretos e semear o catálogo canônico oficial instantaneamente.
  - **🗑️ Exclusão Imediata & Lista Negra Persistente (`radar_itens_ocultos`):** Botão visual de exclusão/lixeira nos cards e na tabela de cotação. Ao clicar em excluir, o item é removido imediatamente do frontend, deletado do banco SQLite (`historico_produtos_valores`) e registrado na tabela de restrição permanente por ID, chave canônica e nome limpo, garantindo que buscas automáticas subsequentes ou requisições à API do Mercado Livre não voltem a exibir produtos indesejados.
  - **Guardião de Sanidade de Preços TCG:** Pisos de mercado por categoria (Display/Booster Box > R$ 140, ETB > R$ 160, Box/Coleção > R$ 50, Blister > R$ 15/R$ 25), eliminando qualquer falso positivo de parsing (ex: "8 boosters" virando R$ 8,00 ou "4 pacotes" virando R$ 4,00) e purgando registros corrompidos legados no SQLite.
  - **Cópia Universal:** Suporte a cópia de mensagens via Clipboard API com fallback automático de textarea invisível para compatibilidade total em conexões HTTP diretas por IP.

---

### 3. 🛍️ Módulo Mercado Livre Afiliados (7 Visões Analíticas Oficiais)
- **Ingestão Oficial da API de Afiliados:** Conexão nativa e contínua com a API do Programa de Afiliados do Mercado Livre (`/affiliate-program/api/dashboard/*`).
- **Resolução de Imagens Defensiva:**
  - Sanitização de URLs antigas ou links bloqueados de CDN externa, substituindo por SVGs de alta definição gerados localmente.
  - Renderização protegida no frontend com fallback elegante via badges temáticos (`Package` / `ShoppingBag`), garantindo ausência de ícones cinzas quebrados em qualquer aba.
- **As 7 Visões Analíticas:**
  1. **Produtos Vendidos:** Tabela detalhada de itens comissionados, faturamento gerado, comissão ganha e links diretos.
  2. **Audiências:** Perfil demográfico completo dos compradores (Faixa etária, Gênero e Distribuição geográfica por estados brasileiros).
  3. **Vendas Não Efetivadas:** Análise de carrinho abandonado, pedidos cancelados e motivos de perda.
  4. **Data (Desempenho Diário & Tendência Recharts):** Histórico dia a dia de receita, comissões, pedidos e taxa de conversão (CVR) com ordenação cronológica decrescente estrita, **3 Mini-Cards de Inteligência Estratégica (Recorde/Melhor Dia do Mês, Média Diária Ativa e Taxa de Conversão CVR)** e **Gráfico Interativo de Tendência Diária (`Recharts ComposedChart`)** com área gradiente esmeralda de comissões, linha ciano de pedidos e tooltip glassmorphism em tempo real.
  5. **Vendas:** Extrato cronológico detalhado das últimas vendas com status e comissão unitária.
  6. **Categorias:** Gráfico comparativo e ranking das categorias mais lucrativas (Brinquedos, Colecionáveis, etc.).
  7. **Etiquetas de Rastreamento:** Monitoramento de campanhas segmentadas pela tag de atribuição oficial (`matt_word` / `matt_tool`).
- **Barra de KPIs de Ouro de Afiliados:**
  - **EPC Hoje (Ganho por Clique):** `commissionsToday / clicksToday` — valor líquido gerado por cada visita comissionada recebida.
  - **Ticket Médio (AOV):** `totalSalesToday / ordersToday` — valor médio faturado por pedido realizado.
  - **Comissão Real %:** `(commissionsToday / totalSalesToday) * 100` — taxa média efetiva de comissionamento (*take-rate* real).
  - **Cesta Média:** `productsEstimatedToday / ordersToday` — quantidade média de itens por carrinho aprovado.
  - **Produtos Estimados:** Total de unidades físicas adquiridas nos pedidos de hoje.
  - **Vendas Não Efetivadas:** Monitoramento de pedidos cancelados ou não aprovados com impacto financeiro.
- **Card Executivo de Arbitragem de Tráfego em Tempo Real (`Net EPC` vs `CPC Meta`):**
  - Motor de inteligência que compara instantaneamente o lucro gerado por clique de afiliado com o custo médio pago por clique nos anúncios do Meta Ads (`Net EPC = EPC - CPC Meta`).
  - Sinalizador visual com badges dinâmicos de lucratividade: **Operação Lucrativa** (spread positivo), **Neutro** (tráfego orgânico) ou **Alerta de Spread** (custo de anúncio superior à comissão unitária).
  - **Régua Visual de Arbitragem (Spread Bar):** Barra de progresso segmentada proporcional de alta precisão exibindo a taxa percentual de retenção de margem líquida, custo do clique pago no Meta Ads e ganho bruto no Mercado Livre em tempo real.

---

### 3. 💼 Módulo de Finanças & Relatórios Executivos
- **Sincronização Direta Meta Ads (Graph API v20.0):** Ingestão automática de gastos (`spend`), impressões, cliques, compras, CPC e CTR direto da conta de anúncios.
- **Auto-Sync Periódico & Midnight Watcher (00:00 BRT):** Sincronização contínua em background da API oficial do Mercado Livre a cada 20 minutos e monitor a cada 30s que reseta pontualmente às 00:00:00 de Brasília comissões, vendas e pedidos de hoje para R$ 0,00, espelhando fielmente o portal do Mercado Livre.
- **Isolamento Temporal Estrito & Soberania Dinâmica do Dia Corrente:** O cache analítico do Mercado Livre isola as métricas diárias (`commissionsToday`, `ordersToday`, `totalSalesToday`, `clicksToday`), blindando contra vazamento de datas anteriores quando a sessão expirar. Aplica **Soberania Dinâmica ao dia corrente**: quando a API oficial do Mercado Livre detecta novas vendas ao longo do dia, o Extrato Diário e o DRE de Finanças (`financas_lancamentos_diarios`) são atualizados e persistidos automaticamente sem ficar congelados por lançamentos manuais antigos, enquanto os lançamentos manuais de dias anteriores permanecem 100% protegidos e imutáveis.
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

## 🧪 Cobertura de Testes Automatizados (129 Testes — 100% Verde)

A plataforma conta com uma suíte de testes unitários e de integração abrangente em `app/test/`:

| Módulo | Qtd Testes | Foco de Validação | Status |
| :--- | :---: | :--- | :---: |
| **Pipeline & Normalização** | 30 | Extração de preços De/Por, remoção de assinaturas concorrentes, formatação limpa e encurtamento `meli.la` | 🟢 Passou (100%) |
| **Guardião TCG & Anti-Spam** | 18 | Filtro estrito de nicho (Pokémon TCG), cooldown de 30 min por produto e bloqueio de lixo | 🟢 Passou (100%) |
| **Parser de Imagens & Mídia** | 14 | Baixa automática de fotos HD oficiais do Mercado Livre, fallback gracioso e integridade | 🟢 Passou (100%) |
| **Estúdio de Imagem 1:1 & Cupons** | 15 | Padronização de fotos com respiro proporcional via `sharp`, anexo da foto amarela de cupom e vitrine | 🟢 Passou (100%) |
| **Gerador & Extrator de Anúncios** | 18 | Extração De/Por/Cupom em links Mercado Livre e Shopee, cópia e disparo em lote com auto-destinos | 🟢 Passou (100%) |
| **Agendador Diário, Bom Dia & Métricas** | 16 | Disparo às 07:00, interpolação, rotação de 4 templates e contagem real de hoje via SQL indexado | 🟢 Passou (100%) |
| **Google Planilhas Webhook** | 6 | Conexão resiliente, formatação de valores em BRL e envio assíncrono não-bloqueante | 🟢 Passou (100%) |
| **Autenticação & Sessão HMAC** | 12 | Login seguro, tokens HMAC e reset diário atômico de comissões na virada de meia-noite | 🟢 Passou (100%) |
| **Total Consolidado** | **129 testes** | **Zero falhas na esteira de automação** | 🟢 **100% VERDE** |

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
