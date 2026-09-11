# Estado Atual — Réplica Autônoma Promo Pokémon TCG

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A esteira de replicação de promoções de Pokémon TCG opera de maneira **100% autônoma**, permanente e resiliente. O projeto foi desvinculado por completo de antigas dependências externas (como n8n, Evolution API e servidores VPS legados), rodando agora em uma arquitetura unificada em **Node.js 22 LTS, TypeScript, Baileys e SQLite**.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Status | Descrição |
| --- | --- | --- | --- |
| **Núcleo de Replicação** | TypeScript + Baileys | 🟢 Ativo | Escuta mensagens, desempacota mídias, remove spam de concorrentes e replica nos destinos |
| **Encurtador de Afiliados**| API Oficial Mercado Livre | 🟢 Ativo | Encurta para `https://meli.la/xxxxxx` via cookie de afiliado com fallback resiliente |
| **Desembrulho de Mídia** | Buffer Baileys + ML Scraper | 🟢 Ativo | Trata fotos diretas, temporárias, de visualização única e busca oficial em 2X |
| **Banco de Dados** | SQLite 3 (`replica.db`) | 🟢 Ativo | Armazena configurações, rotas, cache de grupos e logs com desduplicação SHA-256 |
| **Cockpit Web** | Fastify + WebSockets | 🟢 Ativo | Painel em tempo real responsivo para desktop e celular |
| **Hospedagem em Nuvem** | Railway (Container + Volume) | 🟢 Ativo | Operação contínua 24/7 sem dependência de máquina local ligada |

---

## 3. URLs e Pontos de Acesso

- **Painel Online (Railway)**: `https://promo-replica-bot-production-7d52.up.railway.app`
- **Painel Local**: `http://localhost:3000`
- **Repositório GitHub**: `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`)
