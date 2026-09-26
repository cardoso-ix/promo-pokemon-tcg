# 🧠 CONTEXT.md — Guia de Contexto & Fonte Única da Verdade

> **Nota para IAs e Desenvolvedores:** Este arquivo sintetiza todo o ecossistema do repositório `promo-pokemon-tcg`. Leia este documento antes de realizar qualquer alteração, refatoração ou inclusão de código.

---

## 🎯 1. Visão Geral da Plataforma

A **Promo Pokémon TCG** é um ecossistema profissional em **Node.js 22 LTS e TypeScript**, construído para automação inteligente de vendas, prospecção, tráfego pago, inteligência artificial e engajamento no mercado de Pokémon TCG no WhatsApp.

A plataforma opera **24/7 em produção na VPS HostGator (`108.174.145.77`) gerenciada pelo Coolify**, composta por dois sistemas desacoplados que trabalham em harmonia:

1. **Super Cockpit Unificado (`app/` — Porta 3000):**
   - **Plataforma Única Integrada:** Centraliza tanto o Replicador de Ofertas quanto o Bot Disparador, Prospecção, Atendimento IA e Módulo Financeiro em um único painel coeso, sem necessidade de logins duplicados nem abertura de abas separadas.
   - **Multi-Elemental Design System:** Alternância dinâmica entre **Tema Água 💧** (Ofertas e Replicação), **Tema Fogo 🔥** (Prospecção e Disparos) e **Tema Esmeralda 💼** (Finanças & DRE Meta Ads).
   - **Gateway Proxy de Alto Rendimento:** O servidor Fastify na porta 3000 atua como Gateway reverso para o Bot Disparador (em `/api/bot/*`), com Single Sign-On (SSO) transparente via token interno.
   - **Monitoramento Duplo em Tempo Real:** Visualização simultânea no Top Header do status de conexão dos dois chips de WhatsApp independentes (Replicador e Disparador) e do sentinel do encurtador Mercado Livre (`meli.la`).

2. **Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/` — Porta 3333):**
   - **Função:** Extração de participantes de grupos em 1 clique, disparos em massa com proteção anti-ban (Spintax `{A|B|C}` e tags dinâmicas), simulador WhatsApp ao vivo e atendimento privado humanizado com **DeepSeek V4 via OpenCode Gateway**.
   - **Módulo Financeiro & Meta Ads:** Upload e auditoria de planilhas semanais do Meta Ads e faturas em PDF, cálculo de CPL, CTR, CPC, CPM, Ranking de Campanhas, DRE contábil diário e aplicação automática da regra de reinvestimento (70% do lucro para novas campanhas / 30% distribuição).
   - **Meta Cloud API & Utility Templates:** Disparo oficial via Cloud API com templates de serviço (`UTILITY` a ~R$ 0,18).
   - **Acesso Direto Retrocompatível:** Continua operando na porta 3333 para chamadas diretas e integração com o Gateway.

3. **Ponte Interna Docker & Gateway Unificado (`promo_network`):**
   - Comunicação autenticada via token (`X-Internal-Token`) enviando ofertas replicadas diretamente para a esteira do Bot Disparador (`/api/internal/oferta`) e viabilizando o Gateway reverso unificado na porta 3000.

---

## 🌐 2. Acessos Oficiais em Produção (VPS HostGator)

| Módulo | URL em Produção | Tema Visual | Credenciais Padrão |
| :--- | :--- | :--- | :--- |
| **⚡ Super Cockpit Unificado** | [http://108.174.145.77:3000](http://108.174.145.77:3000) | 🌊 / 🔥 / 💼 Multi-Elemental | Usuário: `admin`<br>Senha: `promo2026` |
| **💧 Réplica Promo (Módulo)** | [http://108.174.145.77:3000](http://108.174.145.77:3000) | 🌊 Tipo Água (Azul + Gotículas 3D) | Usuário: `admin`<br>Senha: `promo2026` |
| **🔥 Disparador Pro & IA (Direto)** | [http://108.174.145.77:3333](http://108.174.145.77:3333) | 🔥 Tipo Fogo (Vermelho + Brasas 3D) | Usuário: `admin`<br>Senha: `promo2026` |
| **⚙️ Painel Coolify** | [http://108.174.145.77:8000](http://108.174.145.77:8000) | ⚙️ Gestão de Containers | Autenticado por Token |

> **Webhook de Deploy Contínuo (Coolify):**
> `POST http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra`  
> Header: `Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed`

---

## 🎨 3. Design System & Identidade Visual

A plataforma unificada segue uma estética dark moderna com Glassmorphism multi-elemental:
- **Tipografia Unificada:**
  - **Títulos e Headings:** `Outfit` (pesos 400, 500, 600, 700).
  - **Corpo e Dados:** `Inter` (pesos 300 a 700).
  - **Código e Dados Técnicos:** `Fira Code`.
- **Glassmorphism & Legibilidade:**
  - Todos os cards, modais e cabeçalhos possuem fundo semi-opaco com `backdrop-filter: blur(16px)` para garantir contraste e legibilidade perfeita.
  - O motor gráfico Canvas 2D em 60fps acelerado por GPU alterna dinamicamente entre Gotículas/Bolhas Cristalinas (Módulo Água 💧), Brasas Incandescentes (Módulo Fogo 🔥) e Partículas Douradas/Esmeralda (Módulo Finanças 💼).
- **Navegação Centralizada Unificada:**
  - Sidebar categorizada com seções claras para Ofertas, Disparos e Finanças.
  - Header superior com monitoramento simultâneo dos 2 chips de WhatsApp e do encurtador Mercado Livre.

---

## 💻 4. Como Desenvolver e Testar em Novo Computador

O repositório opera como um **Monorepo gerenciado por NPM Workspaces** na raiz.

Consulte o manual rápido de migração: [GUIA_MIGRACAO_NOVO_PC.md](GUIA_MIGRACAO_NOVO_PC.md).

### Scripts Turnkey Rápidos:
- **Windows:**
  - `setup-novo-pc.bat` — Configuração automática completa (instala, compila e valida).
  - `iniciar-dev.bat` — Inicia ambos os serviços com **Hot Reload** para desenvolvimento.
  - `iniciar-tudo.bat` — Inicia ambos os serviços no modo de produção local.
  - `parar.bat` — Finaliza com segurança os processos nas portas 3000 e 3333.
- **Linux / macOS:**
  - `./setup-novo-pc.sh`
  - `./iniciar-dev.sh`
  - `./parar.sh`

### Comandos da Raiz (NPM Workspaces):
```bash
npm run setup        # Instala dependências de ambos os projetos e gera os builds
npm test             # Executa a suíte completa de 128 testes automatizados
npm run dev:app      # Inicia Replicador em modo dev com hot reload (Porta 3000)
npm run dev:bot      # Inicia Bot Disparador em modo dev com hot reload (Porta 3333)
npm run build:all    # Compila TypeScript e assets dos dois módulos
```

---

## 📁 5. Mapa de Arquivos Críticos

```text
promo-pokemon-tcg/
├── app/                              # Módulo Replicador de Ofertas (:3000)
│   ├── src/
│   │   ├── core/                     # Lógica de negócio, scraping, regex e afiliados
│   │   ├── db/                       # Banco SQLite better-sqlite3 (replica.db)
│   │   ├── public/                   # Frontend do Cockpit (index.html, style.css, app.js, login.html)
│   │   ├── web/                      # Rotas da API Fastify e autenticação
│   │   └── whatsapp/                 # Conector Baileys, listeners e desembrulho de mídia
│   └── test/                         # 90 testes unitários automatizados
│
├── bot-disparador/                   # Módulo Disparador & Atendimento IA (:3333)
│   ├── src/
│   │   ├── ai/                       # Integração DeepSeek V4 via OpenCode Gateway
│   │   ├── core/                     # Motor Spintax, sanitizador anti-ban, parser Meta Ads e templates
│   │   ├── db/                       # Banco SQLite better-sqlite3 (disparador.db)
│   │   ├── public/                   # Frontend do Cockpit (index.html, style.css, app.js, login.html)
│   │   ├── web/                      # Rotas da API Fastify, upload multipart e autenticação
│   │   └── whatsapp/                 # Conector Baileys para chip de prospecção
│   └── test/                         # 38 testes unitários automatizados
│
├── docs/                             # Documentação técnica e operacional completa
│   ├── MANUAL_PROMO_POKEMON_TCG.md   # Manual de engenharia e regras de negócio
│   ├── arquitetura.md                # Arquitetura completa da VPS HostGator e Coolify
│   ├── banco-de-dados.md             # Esquema completo de replica.db e disparador.db
│   ├── estado-atual.md               # Status de produção e decisões vigentes
│   ├── google-sheets-integracao.md   # Integração com o Google Planilhas
│   ├── historico-de-decisoes.md      # Decisões técnicas e stack adotada
│   ├── regras-de-negocio.md          # Regras de conversão de links e mídia
│   ├── roadmap.md                    # Próximas melhorias planejadas
│   ├── runbook.md                    # Manual operacional de uso dos cockpits
│   └── troubleshooting.md            # Diagnóstico de incidentes
│
├── GUIA_MIGRACAO_NOVO_PC.md          # Checklist rápido de 3 minutos para abrir em outro PC
├── package.json                      # Orquestrador Monorepo NPM Workspaces
├── setup-novo-pc.bat / .sh           # Scripts de preparação automática
├── iniciar-dev.bat / .sh             # Scripts de inicialização com Hot Reload
├── iniciar-tudo.bat                  # Script de produção local
├── parar.bat / .sh                   # Scripts de encerramento seguro (portas 3000 e 3333)
├── docker-compose.coolify.yml        # Orquestração oficial de produção no Coolify
├── README.md                         # Documentação principal do repositório
└── CONTEXT.md                        # Este guia
```

---

## 🔒 6. Regras de Ouro para Próximos Ajustes
1. **Nunca use `any` no TypeScript** (`strict: true` ativado em ambos os módulos).
2. **Mantenha a simetria visual:** Qualquer melhoria de layout ou UX aplicada em um dos cockpits deve ser espelhada no outro (mantendo as cores temáticas: Água no Replicador e Fogo no Disparador).
3. **Mantenha 100% dos 128 testes verdes** antes de fazer `git push`.
4. **Deploy na VPS:** Após `git push origin main`, acione o webhook do Coolify via curl para publicar as alterações na VPS HostGator.
