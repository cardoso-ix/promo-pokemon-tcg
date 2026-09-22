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

| Módulo | Testes Passando | Novos Testes Criados | Status |
|---|---|---|---|
| **Replicador (`app/`)** | **60 / 60** | `internal_sync.test.ts` (Envio com token e resiliência) | 🟢 **Aprovado** |
| **Bot Disparador (`bot-disparador/`)** | **28 / 28** | `internal_bridge.test.ts` (SQLite, token interno e endpoints) | 🟢 **Aprovado** |
| **Total** | **88 / 88** | 4 novos cenários de integração | 🟢 **100% Verde** |

---

## 🌐 Status Atual em Produção na VPS HostGator (108.174.145.77)

O deploy foi executado com sucesso diretamente pelo Coolify via API:
- **Status dos Contêineres:** 🟢 `running:healthy`
- **Painel 1 (Replicador de Ofertas):** 👉 **`http://108.174.145.77:3000`**
- **Painel 2 (Bot Disparador & IA):** 👉 **`http://108.174.145.77:3333`**
- **Painel Administrativo Coolify:** 👉 **`http://108.174.145.77:8000`**

### Credenciais Padrão de Acesso:
- **Usuário:** `admin` (ou `eduardo`)
- **Senha:** `promo2026` (ou a senha customizada que você definir no `.env`)
