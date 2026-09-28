# Guia de Integração Analítica: Mercado Livre & Meta Ads (PostgreSQL + Drizzle)

Este documento especifica a arquitetura, modelos de dados, endpoints e fluxos de ingestão contínua para consolidar métricas de vendas e mídia no dashboard analítico executivo.

---

## 1. Variáveis de Ambiente Necessárias (.env)

Adicione as variáveis abaixo no arquivo `.env` da raiz e da VPS:

```env
# Conexão PostgreSQL (Neon, Supabase ou Postgres Nativo)
DATABASE_URL=postgres://usuario:senha@host:5432/promo_pokemon_tcg?sslmode=require

# Criptografia de Tokens (AES-256-GCM)
TOKEN_ENCRYPTION_KEY=sua-chave-secreta-para-cifra-de-tokens-2026

# Mercado Livre API (OAuth 2.0 & Webhooks)
MELI_APP_ID=seu_client_id_meli
MELI_CLIENT_SECRET=seu_client_secret_meli
MELI_REDIRECT_URI=http://108.174.145.77:3000/api/integrations/meli/callback

# Meta Ads Marketing API (v20.0+)
META_AD_ACCOUNT_ID=act_123456789012345
META_ACCESS_TOKEN=EAAG...seu_system_user_token_permanente...
```

---

## 2. Modelagem do Banco de Dados (PostgreSQL DDL)

As 4 tabelas são migradas automaticamente na inicialização do servidor:

```sql
-- 1. Tokens de Integração
CREATE TABLE IF NOT EXISTS integration_tokens (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL UNIQUE, -- 'mercadolivre' | 'meta_ads'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Pedidos do Mercado Livre
CREATE TABLE IF NOT EXISTS meli_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    date_created TIMESTAMPTZ NOT NULL,
    date_closed TIMESTAMPTZ,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    marketplace_fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    shipping_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50),
    currency_id VARCHAR(10) DEFAULT 'BRL',
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meli_orders_date ON meli_orders (date_created);
CREATE INDEX IF NOT EXISTS idx_meli_orders_status ON meli_orders (status);

-- 3. Métricas Diárias de Anúncios Meta Ads
CREATE TABLE IF NOT EXISTS meta_ad_insights (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    spend NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    ctr NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    cpc NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    purchases INTEGER NOT NULL DEFAULT 0,
    purchase_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meta_insight_date_campaign UNIQUE (date, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_ad_insights (date);

-- 4. Sumário Diário Consolidado (Rollup Analítico)
CREATE TABLE IF NOT EXISTS daily_analytics_summary (
    date DATE PRIMARY KEY,
    total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_fees NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_shipping NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_spend NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    blended_roas NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    avg_cac NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_operating_margin NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Endpoints da API REST

### A. Fluxo OAuth 2.0 do Mercado Livre
* **Iniciar Autorização:**  
  `GET /api/integrations/meli/auth`  
  *Redireciona para o portal de login e consentimento do Mercado Livre.*
* **Callback:**  
  `GET /api/integrations/meli/callback?code={AUTHORIZATION_CODE}`  
  *Recebe o código temporário, realiza a troca por tokens com o Meli e armazena com criptografia AES-256-GCM.*

### B. Webhook em Tempo Real do Mercado Livre
* **Receber Notificações:**  
  `POST /api/webhooks/meli`  
  *Payload de exemplo:*
  ```json
  {
    "resource": "/orders/2000001234567890",
    "user_id": 123456789,
    "topic": "orders_v2",
    "application_id": 987654321,
    "attempts": 1,
    "sent": "2026-09-26T16:00:00.000Z",
    "received": "2026-09-26T16:00:01.000Z"
  }
  ```
  *Resposta imediata: `200 OK` `{ "received": true }`. Processamento de busca do pedido e upsert em segundo plano.*

### C. Sincronização Agendada (Cron / Jobs)
* **Sincronizar Pedidos do Mercado Livre:**  
  `POST /api/integrations/meli/sync`  
  *Body opcional:*
  ```json
  {
    "days": 7
  }
  ```
  *Ou com intervalo customizado:*
  ```json
  {
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2026-09-26T23:59:59.000Z"
  }
  ```

* **Sincronizar Métricas do Meta Ads:**  
  `POST /api/integrations/meta/sync`  
  *Body opcional:*
  ```json
  {
    "since": "2026-09-01",
    "until": "2026-09-26"
  }
  ```

* **Sincronização Unificada em 1 Clique (Meta Ads + Mercado Livre Afiliados + Pedidos):**  
  `POST /api/integrations/sync-all`  
  *Executa em paralelo a busca das métricas do Meta Ads (últimos 30 dias até a data canônica de Brasília `America/Sao_Paulo`), comissões e produtos do Mercado Livre Afiliados e consolidação DRE.*

### D. Endpoint de Afiliados Mercado Livre (Produtos, Audiências & Vendas Perdidas)
* **Consultar Métricas Detalhadas do Portal de Afiliados:**  
  `GET /api/dashboard/meli-affiliate?refresh=true`  
  *Retorna a visão completa com 7 dimensões: `productsSold` (ranking de produtos com fotos, unidades, faturamento e ganhos), `audience` (faixa etária, gênero e estados/UF), `unrealizedSales` (vendas perdidas com motivos e comissão não realizada), `dailyData` (desempenho dia a dia), `recentSales`, `categories` e `trackingTags`.*

### E. Endpoint Consolidado do Dashboard
* **Consultar Métricas e KPIs:**  
  `GET /api/dashboard/overview?startDate=2026-09-01&endDate=2026-09-26`  
  *Exemplo de Retorno:*
  ```json
  {
    "ok": true,
    "data": {
      "periodo": {
        "startDate": "2026-09-01",
        "endDate": "2026-09-26",
        "totalDias": 26
      },
      "totais": {
        "totalRevenueMeli": 18450.00,
        "totalOrdersMeli": 85,
        "totalFeesMeli": 2767.50,
        "totalShippingMeli": 1020.00,
        "totalSpendMeta": 3200.00,
        "blendedRoas": 5.77,
        "avgCac": 37.65,
        "netOperatingMargin": 11462.50,
        "margemPercentual": 62.13
      },
      "serieTemporal": [
        {
          "date": "2026-09-01",
          "revenueMeli": 850.00,
          "ordersMeli": 4,
          "feesMeli": 127.50,
          "shippingMeli": 48.00,
          "spendMeta": 140.00,
          "roasDia": 6.07,
          "cacDia": 35.00,
          "margemLiquidaDia": 534.50
        }
      ],
      "topCampanhasMeta": [
        {
          "campaignId": "1202058493019201",
          "campaignName": "Conversão - Coleções Pokémon TCG 30 Anos",
          "spend": 1850.00,
          "impressions": 48200,
          "clicks": 1420,
          "purchases": 54,
          "purchaseValue": 11880.00,
          "cpc": 1.30,
          "roasAtribuido": 6.42
        }
      ]
    }
  }
  ```

---

## 4. Fórmulas de Inteligência de Negócio

1. **Blended ROAS (Retorno Sobre Gasto em Anúncios):**
   $$\text{Blended ROAS} = \frac{\text{Faturamento Total (Mercado Livre)}}{\text{Investimento Total em Mídia (Meta Ads)}}$$
2. **CAC do Marketplace (Custo de Aquisição de Clientes):**
   $$\text{CAC Médio} = \frac{\text{Investimento Total em Mídia (Meta Ads)}}{\text{Quantidade de Pedidos Realizados (Mercado Livre)}}$$
3. **Margem Operacional Líquida Real (Vendedor):**
   $$\text{Margem Líquida} = \text{Faturamento Meli} - \text{Comissões Meli} - \text{Frete Meli} - \text{Investimento Meta}$$
4. **Margem Percentual (%):**
   $$\text{Margem \%} = \left(\frac{\text{Margem Líquida}}{\text{Faturamento Meli}}\right) \times 100$$

---

## 5. Ingestão do Programa de Afiliados do Mercado Livre (Comissões Reais)

Para contas que operam no modelo de **Afiliado Oficial (comissão por recomendação de produtos TCG)**, a plataforma conecta-se de forma contínua à API interna de afiliados do Mercado Livre através de sessão segura (`meli_cookie` da tag `caed1312314`):

### Endpoints Disponíveis:
- **`GET /api/dashboard/meli-affiliate`**: Retorna as métricas consolidadas em memória/cache SQLite com tempo de resposta sub-10ms. Aceita `?refresh=true` para forçar atualização em tempo real.
- **`POST /api/integrations/meli-affiliate/sync`**: Força sincronização imediata contra os servidores do Mercado Livre e permite atualizar o cookie de sessão (`{ cookie: "..." }`).

### Modelo de Dados de Afiliado:
```typescript
export interface MeliAffiliateOverview {
  tag: string; // Ex: 'caed1312314'
  totalClicks: number; // Ex: 1.882 cliques
  totalBuyers: number; // Compradores únicos
  totalRequests: number;
  totalOrders: number; // Total de pedidos gerados
  totalSales: number; // Volume bruto de vendas geradas (R$)
  totalCommissions: number; // Total de comissões recebidas (R$)
  cvr: number; // Taxa de conversão (ex: 0.0467 -> 4,67%)
  commissionsToday: number; // Comissões de hoje (R$)
  ordersToday: number; // Pedidos de hoje
  recentSales: Array<{
    id: string;
    date: string;
    productName: string;
    productImage: string;
    link: string;
    storeName: string;
    saleValue: number;
    saleUnits: number;
    commissionValue: number;
    commissionPercentage: number;
  }>;
  dailyData: Array<{
    date: string;
    orders: number;
    quantity: number;
    earnings: number;
    touchpoints: number;
    cvr: number;
  }>;
  updatedAt: string;
}
```

### Fórmulas do DRE de Afiliado (Conciliação Contábil Real):
1. **Lucro Líquido Real da Operação:**
   $$\text{Lucro Líquido} = \text{Comissões de Afiliado (Mercado Livre)} - \text{Gasto Total com Anúncios (Meta Ads)}$$
2. **Regra dos 70% de Reinvestimento:**
   $$\text{Reinvestimento em Tráfego (70\%)} = \text{Lucro Líquido} \times 0.70$$
3. **Distribuição para Sócios / Retirada:**
   $$\text{Retirada Sócios (30\%)} = \text{Lucro Líquido} \times 0.30$$

---

## 6. Módulo Nativo de Finanças & Gerador de Relatórios Mensais

Com a integração das bases analíticas, o módulo de finanças opera de forma 100% autônoma através de `FinancasService`:

* **Rotas Disponíveis:**
  - `GET /api/financas/meses`: Retorna os meses arquivados com histórico de tráfego e vendas.
  - `GET /api/financas/balanco?mes=YYYY-MM`: Retorna o DRE consolidado e os itens arquivados dia a dia.
  - `GET /api/financas/relatorio-mensal?mes=YYYY-MM`: Retorna os KPIs executivos consolidados (faturamento, investimento, comissões, margem e ROAS) e detalhamento diário para emissão de relatório formal.
  - `GET /api/financas/exportar-csv?mes=YYYY-MM`: Gera download do extrato contábil formatado em CSV.
  - `POST /api/financas/despesas`: Registra despesas complementares ou faturas.
  - `DELETE /api/financas/despesas/:id`: Remove lançamento de fatura.

* **Recursos do Gerador Executivo no Frontend (`FinancasView`):**
  - Botão **"Gerar Relatório do Mês"**: Abre modal executivo com design institucional de auditoria.
  - Visualização de 6 KPIs Chave: Faturamento Meli, Investimento Meta Ads, Comissões Confirmadas, Lucro Operacional Líquido, Blended ROAS e Margem Operacional.
  - Painel de Governança 70/30 (Reinvestimento em Tráfego vs Caixa Livre).
  - Tabela Diária Completa: Data, Gasto Meta, Cliques, Impressões, Vendas, Comissões, Saldo Líquido e Blended ROAS do dia.
  - Impressão formatada para PDF (`window.print()`) e exportação direta em CSV.

---

## 7. Desintegração do Bot Disparador & Foco em Tráfego Pago

Em alinhamento com a estratégia de crescimento focada exclusivamente em **Tráfego Pago (Meta Ads)** e **Mercado Livre Afiliados**:
- O serviço `bot-disparador` (mass sender, campanhas, grupos de leads e metacloud) foi completamente desintegrado e removido do repositório.
- A aplicação principal (`app`) tornou-se significativamente mais leve, rápida e estável, sem overhead de segundo chip WhatsApp ou consumo desnecessário de memória na VPS.
- Todas as rotas analíticas e financeiras foram migradas nativamente para `app`, garantindo alta performance e atomicidade nas consultas SQLite.

---

## 8. Sincronização & Resiliência do Mercado Livre Afiliados

O painel de Inteligência de Afiliados (`meli-affiliate.service.ts` e `MeliAfiliadosView.tsx`) opera com tripla camada de auditoria e contingência contra o delay de processamento em lotes do Mercado Livre:

* **Rotas de Afiliados:**
  - `GET /api/dashboard/meli-affiliate?refresh=true|false`: Carrega métricas consolidadas (produtos mais vendidos, demografia, faturamento e comissões de hoje).
  - `POST /api/afiliados/cookie`: Endpoint oficial para renovar o cookie de sessão do portal Mercado Livre, validando a integridade da sessão e disparando sincronização em tempo real.
  - `POST /api/dashboard/meli-affiliate/manual`: Endpoint para registro/ajuste pontual das métricas de hoje (ganhos estimados, ordens, cliques e vendas brutas). Garante conciliação imediata no Cockpit e no DRE financeiro mesmo durante atrasos de consolidação da plataforma do Mercado Livre.

* **Regras de Não-Falsificação de Dados:**
  - Remoção de qualquer fallback artificial ou estimativas fictícias: se a sessão expirar ou o dia não possuir pedidos registrados, o sistema relata estritamente os valores reais auditáveis (`0,00` ou dados confirmados) com alerta visual no painel.

---

## 9. Módulo de Caixa & Gestão de Recargas Meta Ads (Híbrido)

Para permitir acompanhamento em tempo real da verba restante disponível para anúncios (fundos pré-pagos, saldo em conta e limite de crédito), o sistema conta com o módulo híbrido de Saldo de Caixa:

* **Rotas da API:**
  - `GET /api/integrations/meta/balance`: Consulta saldo atual da conta de anúncios, status da conta na Meta (1 = Ativa, etc.), moeda (`BRL`), limite de gastos (`spend_cap`), total gasto histórico (`amount_spent`), forma de pagamento / fundos (`funding_source_details`), status badge (`healthy`, `warning`, `critical`), limiar de alerta e histórico recente de recargas.
  - `POST /api/integrations/meta/balance`: Permite adicionar recarga de verba (soma ao caixa atual), definir saldo exato do Gerenciador de Anúncios, alterar limite de alerta de saldo baixo (default: R$ 50,00) ou selecionar o modo de operação (`hybrid`, `auto`, `manual`).

* **Modelagem no SQLite (`meta_ad_recargas` e `configs`):**
  - Tabela `meta_ad_recargas`: Armazena histórico cronológico de depósitos (PIX, boleto, cartão) com `id`, `valor`, `descricao`, `saldo_resultante` e `data_recarga`.
  - Configurações persistidas: `meta_ad_balance_manual`, `meta_ad_balance_mode`, `meta_ad_alert_threshold`, `meta_ad_balance_last_sync` e `meta_ad_balance_api_cached`.

* **Regras de Negócio e Indicadores:**
  - **Saldo Saudável (🟢):** Saldo $\ge$ Limiar configurado (ex: R$ 50,00).
  - **Saldo Baixo (🟡):** Saldo $<$ Limiar configurado, recomendando nova recarga preventiva.
  - **Recarga Urgente (🔴):** Saldo $\le$ R$ 0,00 ou conta desativada na Meta.
