# Estado Atual — Plataforma Promo Pokémon TCG (Nuvem 24/7)

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A plataforma de automação de vendas e captação de clientes de **Pokémon TCG** opera de maneira **100% autônoma, permanente e em nuvem na VPS HostGator própria gerenciada pelo Coolify**. 

O ecossistema roda de forma desvinculada de qualquer máquina local ou nuvem paga por hora, dividido em **dois serviços independentes em contêineres Docker** com volumes de armazenamento persistente NVMe (`/app/data`), garantindo que tanto as sessões do WhatsApp quanto os bancos de dados nunca sejam perdidos.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Ambiente / Status | Descrição |
| --- | --- | --- | --- |
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (Tema Água 💧)** | Layout moderno com Sidebar limpa, cor azul ciano oceano e motor de partículas com gotículas e bolhas d'água 3D em 60fps. Monitora grupos, intercepta concorrentes, encurta para `meli.la` e replica com foto 2X HD. |
| **Bot Disparador & Leads** | TypeScript + Baileys + Spintax | 🟢 **Online 24/7 (Tema Fogo 🔥)** | Layout moderno com Sidebar limpa, cor vermelho rubi/âmbar e motor de partículas com brasas e fagulhas incandescentes 3D em 60fps. Extração de leads, disparos anti-ban e atendimento IA com DeepSeek. |
| **Atendimento IA Privado** | DeepSeek V4 (OpenCode Gateway) | 🟢 **Online 24/7 (VPS HostGator)** | Responde clientes no privado imitando especialista amigável de Pokémon TCG com digitação humanizada. |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo (Sentinel 45m)** | Monitorado pelo Cookie Sentinel em tempo real, encurtador oficial `https://meli.la/xxxxxx` e fallback resiliente. |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Named Volumes)** | `replica.db` e `disparador.db` salvos com segurança em `/app/data` via volumes Docker `promo_replica_data` e `bot_disparador_data`. |
| **Cockpits Web & Segurança** | Fastify + WebSockets + UI TCG | 🟢 **Online (Inter & Outfit)** | Interface temática com tipografia unificada `Inter` e `Outfit`, sem poluição, cards com `backdrop-filter: blur(16px)` e alternância rápida no Top Header. |
| **Google Planilhas ("produtos tcg valores")** | Webhook Apps Script + Dual-Write Local | 🟢 **Ativo (Sincronização Contínua)** | Registra automaticamente cada oferta enviada nos grupos com Data/Hora, Nome do Produto, Valor Promocional (Por), Preço Original (De) e Link Afiliado. |
| **Mensagem Diária de Abertura (07:00 AM)** | Scheduler Nativo (Fuso de Brasília) | 🟢 **Ativo (Anti-Duplicidade)** | Dispara automaticamente mensagem calorosa todas as manhãs às 07:00 AM com agradecimento e convite de amigos. |

---

## 3. URLs e Acessos em Produção (Nuvem)

Ambos os serviços operam 24/7 na VPS HostGator:

* **Painel Replicador de Ofertas**:  
  👉 **`http://108.174.145.77:3000`**
* **Painel Bot Disparador & Atendimento IA**:  
  👉 **`http://108.174.145.77:3333`**
* **Painel de Gestão Coolify**:  
  👉 **`http://108.174.145.77:8000`**
* **Repositório GitHub Oficial**:  
  👉 `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`)

> [!NOTE]
> Credenciais padrão de acesso a ambos os cockpits:  
> Usuário: **`admin`** | Senha: **`promo2026`** (Sessão segura de 30 dias).

---

## 4. Cobertura de Testes Automatizados
- **Total de Testes:** **88 testes unitários** (0 falhas).
  - `app`: 60 testes aprovados.
  - `bot-disparador`: 28 testes aprovados.
