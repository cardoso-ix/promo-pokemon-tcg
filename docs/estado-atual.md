# Estado Atual — Plataforma Promo Pokémon TCG (Nuvem 24/7)

**Última atualização:** Setembro/2026

## 1. Situação do Projeto

A plataforma de automação de vendas e captação de clientes de **Pokémon TCG** opera de maneira **100% autônoma, permanente e em nuvem (Railway)**. 

O ecossistema roda de forma desvinculada de qualquer máquina local, dividido em **dois serviços independentes em contêineres Docker** com volumes de armazenamento persistente NVMe (`/app/data`), garantindo que tanto as sessões do WhatsApp quanto os bancos de dados nunca sejam perdidos.

---

## 2. Status dos Módulos Operacionais

| Módulo | Tecnologia | Ambiente / Status | Descrição |
| --- | --- | --- | --- |
| **Replicador de Ofertas** | TypeScript + Baileys + Fastify | 🟢 **Online 24/7 (Railway)** | Monitora grupos de ofertas, intercepta links concorrentes, encurta para `meli.la` oficial e replica com fotos 2X |
| **Bot Disparador & Leads** | TypeScript + Baileys + Spintax | 🟢 **Online 24/7 (Railway)** | Extração de membros de grupos em 1 clique, disparador anti-ban com Spintax dinâmico e simulador ao vivo |
| **Atendimento IA Privado** | DeepSeek V4 (OpenCode Gateway) | 🟢 **Online 24/7 (Railway)** | Responde clientes no privado imitando especialista amigável de Pokémon TCG com digitação humanizada |
| **Encurtador de Afiliados** | API Oficial Mercado Livre | 🟢 **Ativo** | Gera links curtos `https://meli.la/xxxxxx` via cookie de afiliado com fallback resiliente `matt_word` |
| **Bancos de Dados SQLite** | Better-SQLite3 (WAL Mode) | 🟢 **Ativo (Volumes Persistentes)** | `replica.db` e `disparador.db` salvos com segurança em `/app/data` |
| **Cockpits Web** | Fastify + WebSockets + UI Dark | 🟢 **Online (HTTPS)** | Painéis responsivos com estética Google Cloud / Gemini acessíveis de qualquer celular ou PC |

---

## 3. URLs e Acessos em Produção (Nuvem)

Ambos os serviços operam 24/7 na nuvem:

* **Painel Replicador de Ofertas (Railway)**:  
  👉 **`https://promo-replica-bot-production-7d52.up.railway.app`**
* **Painel Bot Disparador & Atendimento IA (Railway)**:  
  👉 **Disponível no painel do seu projeto no Railway** *(porta interna mapeada automaticamente com domínio HTTPS)*
* **Repositório GitHub Oficial**:  
  👉 `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`)

> [!NOTE]
> A execução local (`localhost:3000` ou `localhost:3333` via scripts `.bat`) permanece disponível apenas como ambiente de desenvolvimento e testes offline, não sendo necessária para a operação diária.
