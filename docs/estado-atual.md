# Estado Atual — Plataforma Promo Pokémon TCG (Nuvem 24/7)

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A plataforma de automação de vendas e captação de clientes de **Pokémon TCG** opera de maneira **100% autônoma, permanente e em nuvem (Railway)**. 

O ecossistema roda de forma desvinculada de qualquer máquina local, dividido em **dois serviços independentes em contêineres Docker** com volumes de armazenamento persistente NVMe (`/app/data`), garantindo que tanto as sessões do WhatsApp quanto os bancos de dados nunca sejam perdidos.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Ambiente / Status | Descrição |
| --- | --- | --- | --- |
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (Suíte Pro C)** | Monitora grupos de ofertas, intercepta links concorrentes, encurta para `meli.la` oficial e replica com fotos 2X. Inclui **Opção C**: 3 templates de marca, Guardião de Nicho TCG, Desduplicação Global Cross-Group Canônica (MLB ID) e Pacing anti-burst. |
| **Bot Disparador & Leads** | TypeScript + Baileys + Spintax | 🟢 **Online 24/7 (Railway)** | Extração de membros de grupos em 1 clique, disparador anti-ban com Spintax dinâmico e simulador ao vivo |
| **Atendimento IA Privado** | DeepSeek V4 (OpenCode Gateway) | 🟢 **Online 24/7 (Railway)** | Responde clientes no privado imitando especialista amigável de Pokémon TCG com digitação humanizada |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo (Sentinel 45m)** | Monitorado pelo Cookie Sentinel em tempo real, encurtador oficial `https://meli.la/xxxxxx` e fallback resiliente |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Volumes Persistentes)** | `replica.db` e `disparador.db` salvos com segurança em `/app/data` (com tabela `produtos_replicados`) |
| **Cockpits Web & Segurança** | Fastify + WebSockets + UI TCG | 🟢 **Online (Ultra Ball & Holo Foil)** | Interface temática Pokémon TCG com efeito Rare Holo Foil, badges de energia, barra de HP da sessão e balões WhatsApp Dark autênticos. Integração direta entre replicador e disparador. |
| **Google Planilhas ("produtos tcg valores")** | Webhook Apps Script + Dual-Write Local | 🟢 **Ativo (Sincronização Contínua)** | Registra automaticamente cada oferta enviada nos grupos com Data/Hora, Nome do Produto, Valor Promocional (Por), Preço Original (De) e Link Afiliado. |

---

## 3. URLs e Acessos em Produção (Nuvem)

Ambos os serviços operam 24/7 na nuvem:

* **Painel Replicador de Ofertas (Railway)**:  
  👉 **`https://promo-replica-bot-production.up.railway.app`**
* **Painel Bot Disparador & Atendimento IA (Railway)**:  
  👉 **`https://bot-disparador-ia-production.up.railway.app`**
* **Repositório GitHub Oficial**:  
  👉 `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`)

> [!NOTE]
> A execução local (`localhost:3000` ou `localhost:3333` via scripts `.bat`) permanece disponível apenas como ambiente de desenvolvimento e testes offline, não sendo necessária para a operação diária.
