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

### D. Endpoint Consolidado do Dashboard
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
3. **Margem Operacional Líquida Real:**
   $$\text{Margem Líquida} = \text{Faturamento Meli} - \text{Comissões Meli} - \text{Frete Meli} - \text{Investimento Meta}$$
4. **Margem Percentual (%):**
   $$\text{Margem \%} = \left(\frac{\text{Margem Líquida}}{\text{Faturamento Meli}}\right) \times 100$$
