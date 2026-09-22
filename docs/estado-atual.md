# Estado Atual — Plataforma Promo Pokémon TCG (Nuvem 24/7)

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A plataforma de automação de vendas e captação de clientes de **Pokémon TCG** opera de maneira **100% autônoma, permanente e em nuvem na VPS HostGator própria gerenciada pelo Coolify**. 

O ecossistema roda de forma desvinculada de qualquer máquina local ou nuvem paga por hora, dividido em **dois serviços independentes em contêineres Docker** com volumes de armazenamento persistente NVMe (`/app/data`), garantindo que tanto as sessões do WhatsApp quanto os bancos de dados nunca sejam perdidos.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Ambiente / Status | Descrição |
| --- | --- | --- | --- |
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (VPS HostGator)** | Monitora grupos de ofertas, intercepta links concorrentes, encurta para `meli.la` oficial e replica com fotos 2X. Inclui 3 templates de marca, Guardião de Nicho TCG, Desduplicação Global Cross-Group Canônica (MLB ID) e Pacing anti-burst. |
| **Bot Disparador & Leads** | TypeScript + Baileys + Spintax | 🟢 **Online 24/7 (VPS HostGator)** | Extração de membros de grupos em 1 clique, disparador anti-ban com Spintax dinâmico e simulador ao vivo. |
| **Atendimento IA Privado** | DeepSeek V4 (OpenCode Gateway) | 🟢 **Online 24/7 (VPS HostGator)** | Responde clientes no privado imitando especialista amigável de Pokémon TCG com digitação humanizada. |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo (Sentinel 45m)** | Monitorado pelo Cookie Sentinel em tempo real, encurtador oficial `https://meli.la/xxxxxx` e fallback resiliente. |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Named Volumes)** | `replica.db` e `disparador.db` salvos com segurança em `/app/data` via volumes Docker `promo_replica_data` e `bot_disparador_data`. |
| **Cockpits Web & Segurança** | Fastify + WebSockets + UI TCG | 🟢 **Online (Ultra Ball & Holo Foil)** | Interface temática Pokémon TCG com efeito Rare Holo Foil, badges de energia, barra de HP da sessão e balões WhatsApp Dark autênticos. Integração direta entre replicador e disparador. |
| **Google Planilhas ("produtos tcg valores")** | Webhook Apps Script + Dual-Write Local | 🟢 **Ativo (Sincronização Contínua)** | Registra automaticamente cada oferta enviada nos grupos com Data/Hora, Nome do Produto, Valor Promocional (Por), Preço Original (De) e Link Afiliado. |

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
> O Railway foi completamente desativado, evitando cobranças e concorrência de sessão de WhatsApp. Toda a operação está consolidada e isolada na VPS.
