# 🚀 Guia Definitivo: Deploy em VPS com Coolify 24/7 (Promo Pokémon TCG)

Este guia prático explica como subir e manter todo o ecossistema **Promo Pokémon TCG** (Replicador de Ofertas + Bot Disparador & IA) na sua **VPS própria** utilizando o **Coolify** como plataforma de orquestração PaaS (alternativa auto-hospedada ao Railway/Render).

---

## 🏗️ 1. Por Que Usar Coolify na VPS?

- **Zero mensalidade de nuvem:** Você paga apenas o valor fixo da sua VPS (Hostinger, Hetzner, DigitalOcean, Contabo, etc.), sem limites de horas ou surpresas na fatura.
- **SSL Automático (HTTPS):** Emissão e renovação automática de certificados Let's Encrypt para seus domínios através do proxy Traefik embutido.
- **Persistência Total (Anti-Deslogamento do WhatsApp):** Os dados do Baileys (`creds.json`) e os bancos SQLite (`replica.db` e `disparador.db`) ficam protegidos em volumes persistentes NVMe.
- **Auto-Deploy via Webhook (CI/CD):** Qualquer `git push origin main` no seu repositório atualiza a aplicação em menos de 2 minutos sem derrubar a conexão do WhatsApp.
- **Comunicação Interna de Alta Velocidade:** Os dois bots conversam entre si pela rede interna Docker (`promo_network`) com latência inferior a 1ms.

---

## 🖥️ 2. Requisitos da VPS

| Recurso | Requisito Mínimo | Recomendado para Produção |
|---|---|---|
| **Sistema Operacional** | Ubuntu 22.04 LTS ou 24.04 LTS | Ubuntu 24.04 LTS (x86_64) |
| **CPU** | 2 vCPUs | 2 a 4 vCPUs |
| **Memória RAM** | 2 GB | 4 GB |
| **Armazenamento** | 20 GB SSD/NVMe | 40 GB NVMe |
| **Portas de Entrada** | 80, 443, 22, 8000 | Liberadas no Firewall / UFW |

---

## ⚡ 3. Passo 1: Instalar o Coolify na VPS

Acesse sua VPS via SSH:

```bash
ssh root@IP_DA_SUA_VPS
```

Execute o comando oficial de instalação do Coolify (ele instala Docker, Traefik e o painel web automaticamente):

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Ao terminar a instalação (cerca de 2 a 3 minutos), abra o navegador e acesse:
👉 **`http://IP_DA_SUA_VPS:8000`**

Crie sua conta de administrador (usuário e senha) no primeiro acesso.

---

## 🌐 4. Passo 2: Configurar seus Domínios no DNS (Cloudflare / Hostinger / Registro.br)

Para ter URLs profissionais com cadeado HTTPS (ex: `promo.seudominio.com` e `disparador.seudominio.com`):

1. Acesse o painel do seu gerenciador de domínio (ex: **Cloudflare**).
2. Adicione **2 apontamentos do Tipo A**:
   - **Nome:** `promo` | **Tipo:** `A` | **Conteúdo/IP:** `IP_DA_SUA_VPS` | **Proxy:** DNS Only (ou Proxied com WebSockets ativo)
   - **Nome:** `disparador` | **Tipo:** `A` | **Conteúdo/IP:** `IP_DA_SUA_VPS` | **Proxy:** DNS Only (ou Proxied com WebSockets ativo)

---

## 📦 5. Passo 3: Criar a Stack no Coolify

1. No painel do Coolify, clique em **Projects** ➔ **+ Add Project**.
2. Clique no ambiente gerado (ex: `production`) ➔ **+ New Resource**.
3. Selecione a opção **Docker Compose**.
4. Escolha **Git Repository**:
   - **Repository:** `https://github.com/cardoso-ix/promo-pokemon-tcg` (ou selecione sua conta integrada do GitHub)
   - **Branch:** `main`
   - **Custom Docker Compose File:** Aponte para:
     ```text
     docker-compose.coolify.yml
     ```
   *(Ou se preferir, selecione "Docker Compose Empty" e cole diretamente o conteúdo do arquivo `docker-compose.coolify.yml` presente na raiz do projeto).*

---

## 🔐 6. Passo 4: Configurar as Variáveis de Ambiente no Coolify

Na aba **Environment Variables** da sua stack no Coolify, preencha os valores conforme o modelo `.env.example`:

```dotenv
# Domínios com HTTPS
PROMO_DOMAIN=promo.seudominio.com
DISPARADOR_DOMAIN=disparador.seudominio.com

# Segurança dos Painéis
ADMIN_USER=eduardo
ADMIN_PASS=SuaSenhaForteAqui2026!
SESSION_SECRET=uma_chave_super_longa_e_aleatoria_com_mais_de_32_caracteres_seguros

# Ponte de Comunicação Interna
INTERNAL_API_KEY=sua_chave_interna_compartilhada_2026
DISPARADOR_URL=http://bot-disparador:3333
SYNC_DISPARADOR=true

# Mercado Livre Afiliados
MATT_WORD=caed1312314
MATT_TOOL=96097202
MELI_COOKIE=
MELI_TAG=caed1312314

# Inteligência Artificial DeepSeek V4 (Disparador)
DEEPSEEK_API_KEY=sua_chave_opencode_ou_deepseek
DEEPSEEK_BASE_URL=https://opencode.ai/zen/go/v1
DEEPSEEK_MODEL=deepseek-v4-flash
```

Clique em **Save** e em seguida em **Deploy**.

---

## 🔄 7. Passo 5: Como Deixar o Coolify "Conversando"

### A) Conversação Git ➔ Coolify (CI/CD com Auto-Deploy)
1. No Coolify, na página da sua aplicação, clique na aba **Webhooks**.
2. Copie a URL do **Deploy Webhook** gerada pelo Coolify.
3. No seu repositório GitHub (`https://github.com/cardoso-ix/promo-pokemon-tcg`):
   - Vá em **Settings** ➔ **Webhooks** ➔ **Add webhook**.
   - No campo **Payload URL**, cole a URL do Coolify.
   - **Content type:** Selecione `application/json`.
   - **Which events would you like to trigger this webhook?**: `Just the push event`.
   - Clique em **Add webhook**.
4. **Pronto!** Agora todo `git push origin main` dispara o build e deploy automático na VPS sem precisar tocar no servidor!

### B) Conversação Interna: Replicador ➔ Disparador (Ponte de Ofertas)
- Graças à rede Docker `promo_network`, o Replicador envia automaticamente qualquer promoção de Pokémon TCG validada para `http://bot-disparador:3333/api/internal/oferta`.
- A autenticação é feita pelo header `X-Internal-Token` com a `INTERNAL_API_KEY`.
- No painel do Disparador, a oferta fica salva em **Ofertas Recebidas**, pronta para ser transformada em campanha de prospecção com 1 clique!

### C) Conversação Coolify ➔ Notificações (Discord / Telegram)
1. No menu lateral do Coolify, acesse **Notifications**.
2. Escolha **Telegram** ou **Discord**.
3. Adicione o Webhook do seu canal do Discord ou o Bot Token do Telegram.
4. Ative os alertas:
   - ✅ *Deploy Status (Sucesso / Falha)*
   - ✅ *Container Healthcheck (Alerta se o WhatsApp ou o Node cair)*
   - ✅ *Server Disk / Memory Warnings (Alerta de uso de RAM na VPS)*

---

## 🛡️ 8. Backup Automático dos Bancos SQLite e Sessões Baileys

Os dados do sistema ficam armazenados nos volumes persistentes do Docker:
- `/var/lib/docker/volumes/promo_replica_data/_data`
- `/var/lib/docker/volumes/bot_disparador_data/_data`

Para criar um backup automático diário compactado às 03:00 da madrugada:

1. Na VPS, crie o script de backup:
   ```bash
   mkdir -p /root/backups
   nano /root/backup-promo.sh
   ```
2. Cole o conteúdo:
   ```bash
   #!/bin/bash
   DATA=$(date +%Y-%m-%d_%H-%M)
   DESTINO="/root/backups/promo-tcg-$DATA.tar.gz"
   tar -czf "$DESTINO" /var/lib/docker/volumes/promo_replica_data/_data /var/lib/docker/volumes/bot_disparador_data/_data
   # Manter apenas os últimos 7 dias de backup
   find /root/backups -type f -name "*.tar.gz" -mtime +7 -delete
   echo "Backup concluído: $DESTINO"
   ```
3. Dê permissão de execução:
   ```bash
   chmod +x /root/backup-promo.sh
   ```
4. Agende no cron (`crontab -e`):
   ```bash
   0 3 * * * /root/backup-promo.sh >> /var/log/backup-promo.log 2>&1
   ```

---

## 🛠️ 9. Comandos Úteis e Operação na VPS

```bash
# Ver status dos contêineres e healthchecks
docker ps

# Ver logs em tempo real do Replicador
docker logs -f promo-replica-bot

# Ver logs em tempo real do Disparador
docker logs -f bot-disparador-ia

# Reiniciar um serviço manualmente
docker restart promo-replica-bot
docker restart bot-disparador-ia

# Testar healthcheck diretamente pelo terminal
curl -I http://localhost:3000/health
curl -I http://localhost:3333/health
```

---

## ✅ Resumo da Arquitetura em Produção

```
                    INTERNET (SEUS USUÁRIOS & VOCÊ)
                                   │
                                   ▼
                   TRAEFIK REVERSE PROXY (COOLIFY)
              (SSL Let's Encrypt Automático nas Portas 80/443)
                  │                                  │
    Host: promo.seudominio.com          Host: disparador.seudominio.com
                  │                                  │
                  ▼ (Porta 3000)                     ▼ (Porta 3333)
       ┌────────────────────────┐         ┌────────────────────────┐
       │   PROMO REPLICA BOT    │ ──────> │   BOT DISPARADOR & IA  │
       │  • WhatsApp Baileys    │  Ponte  │  • WhatsApp Baileys    │
       │  • Encurtador meli.la  │ Interna │  • Extrator de Leads   │
       │  • Healthcheck :3000   │  Docker │  • DeepSeek V4 IA      │
       └───────────┬────────────┘         └───────────┬────────────┘
                   │                                  │
                   ▼                                  ▼
         [Volume: replica_data]             [Volume: disparador_data]
         • auth_baileys/ (Sessão)           • auth/ (Sessão)
         • replica.db (SQLite)              • disparador.db (SQLite)
```
