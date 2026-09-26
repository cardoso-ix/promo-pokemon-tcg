# Walkthrough: Varredura Técnica, Ponte Interna & Deploy Coolify na VPS

Concluímos a **varredura completa do ecossistema Promo Pokémon TCG**, corrigimos os gargalos arquiteturais e preparamos a plataforma para deploy contínuo em **VPS própria gerenciada pelo Coolify**.

---

## 🚀 Resumo das Entregas e Alterações Realizadas

### 1. Resiliência de Contêineres & Healthchecks
- [Dockerfile](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/Dockerfile): Adicionada instrução de `HEALTHCHECK` chamando `/health` a cada 30 segundos com auto-restart.
- [bot-disparador/Dockerfile](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/bot-disparador/Dockerfile): Porta padrão fixada em `3333` (eliminando o conflito com a porta 3000 do Replicador) e adicionado `HEALTHCHECK` nativo.
- [bot-disparador/src/index.ts](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/bot-disparador/src/index.ts): Removido o comportamento ambíguo de fallback de porta em produção.

### 2. Ponte de Comunicação Interna (Rede Docker)
- [app/src/core/internal-sync.ts](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/app/src/core/internal-sync.ts): Novo módulo responsável por enviar as ofertas de Pokémon TCG replicadas para o disparador com timeout estrito de 3s e proteção contra falhas.
- [app/src/whatsapp/client.ts](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/app/src/whatsapp/client.ts): Integrada a chamada assíncrona após cada réplica bem-sucedida nos grupos do WhatsApp.
- [bot-disparador/src/db/database.ts](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/bot-disparador/src/db/database.ts): Criada a tabela `ofertas_recebidas` no SQLite com funções de salvamento, listagem e controle de status.
- [bot-disparador/src/web/server.ts](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/bot-disparador/src/web/server.ts):
  - Criado o endpoint protegido `POST /api/internal/oferta` autenticado via header `X-Internal-Token`.
  - Criados os endpoints REST `GET /api/ofertas-recebidas`, `PATCH /api/ofertas-recebidas/:id/status` e `DELETE /api/ofertas-recebidas/:id`.

### 3. Orquestração e Deploy na VPS (Coolify)
- [docker-compose.coolify.yml](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/docker-compose.coolify.yml): Arquivo oficial de produção pronto para o Coolify com:
  - **Named Volumes**: `promo_replica_data` e `bot_disparador_data` (garantindo que o WhatsApp **nunca deslogue** e o SQLite nunca se perca após deploys).
  - **Rede Interna**: `promo-network` para comunicação privada ultrarrápida.
  - **Traefik Labels**: Geração automática de certificados SSL Let's Encrypt (HTTPS) para os domínios.
  - **Limites de Memória**: `mem_limit: 512m` em cada serviço para proteger a VPS contra estouro de RAM (OOM).
- [.env.example](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/.env.example): Modelo completo de variáveis documentadas para fácil preenchimento no Coolify.
- [docker-compose.yml](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/docker-compose.yml): Atualizado para manter paridade com o ambiente local e tradicional.

### 4. Documentação Proativa
- [docs/deploy-coolify.md](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/docs/deploy-coolify.md): Manual passo a passo detalhando:
  - Instalação do Coolify na VPS em 1 comando.
  - Apontamento de DNS na Cloudflare/Hostinger.
  - Configuração do Webhook do GitHub para auto-deploy contínuo.
  - Como os bots conversam via rede interna e como configurar alertas no Telegram/Discord.
  - Script de backup automatizado no cron diário.
- [README.md](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/README.md) e [docs/arquitetura.md](file:///c:/Users/eduar/Projects/promo-pokemon-tcg/docs/arquitetura.md): Atualizados com as novas capacidades.

---

## 🧪 Validação dos Testes Automatizados

Executamos as suítes de testes de ponta a ponta:

| Módulo | Testes Passando | Suíte Automatizada | Status |
|---|---|---|---|
| **Replicador & Gateway (`app/`)** | **90 / 90** | Testes de replicação, cupons, nicho TCG, parcerias e gateway | 🟢 **Aprovado** |
| **Bot Disparador & IA (`bot-disparador/`)** | **38 / 38** | Testes de campanhas, Meta utility, Spintax, finanças e DeepSeek | 🟢 **Aprovado** |
| **Total** | **128 / 128** | Suíte de ponta a ponta 100% verde | 🟢 **100% Aprovado** |

---

## 🌐 Status Atual em Produção na VPS HostGator (108.174.145.77)

O deploy da **nova versão SPA moderna com React 19, Tailwind CSS v4 e Recharts** foi executado com sucesso diretamente pelo Coolify via API:
- **Status dos Contêineres:** 🟢 `running:healthy`
- **Super Cockpit Unificado (Novo Frontend):** 👉 **`http://108.174.145.77:3000`**
  - Chip 1 (Replicador): Conectado (`554998095955`) sem deslogar
  - Cookie Mercado Livre: Válido e operacional (`meli.la` ativo)
  - Ofertas replicadas em tempo real preservadas no SQLite NVMe
- **Módulo Disparador & IA (Acesso Direto):** 👉 **`http://108.174.145.77:3333`**
- **Painel Administrativo Coolify:** 👉 **`http://108.174.145.77:8000`**

### Credenciais Padrão de Acesso:
- **Usuário:** `admin` (ou `eduardo`)
- **Senha:** `promo2026`
