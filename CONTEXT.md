# 🧠 CONTEXT.md — Guia de Contexto & Fonte Única da Verdade

> **Nota para IAs e Desenvolvedores:** Este arquivo sintetiza todo o ecossistema do repositório `promo-pokemon-tcg`. Leia este documento antes de realizar qualquer alteração, refatoração ou inclusão de código.

---

## 🎯 1. Visão Geral da Plataforma

A **Promo Pokémon TCG** é um ecossistema profissional em **Node.js 22 LTS e TypeScript**, construído para automação inteligente de vendas, prospecção, tráfego pago, inteligência artificial e engajamento no mercado de Pokémon TCG no WhatsApp.

A plataforma opera **24/7 em produção na VPS HostGator (`108.174.145.77`) gerenciada pelo Coolify**, composta por dois sistemas desacoplados que trabalham em harmonia:

1. **Replicador de Ofertas (`app/` — Porta 3000):**
   - **Tema Visual:** 🌊 Tipo Água (Azul Cyan, Pokéball Água, Gotículas/Bolhas 3D animadas em 60fps).
   - **Função:** Monitora grupos de ofertas concorrentes, intercepta links, higieniza mensagens, encurta links com a API oficial do Mercado Livre (`https://meli.la/xxxxxx`), baixa fotos oficiais em 2X e replica nos grupos VIP de destino.
   - **Integração Google Planilhas:** Registra automaticamente na planilha *"produtos tcg valores"* cada oferta postada via Webhook Google Apps Script.
   - **Mensagem Matinal de Abertura:** Posta automaticamente às 07:00 AM (Horário de Brasília) mensagem de bom dia com rotação de 4 templates.
   - **Gerador de Anúncios Reativo:** Extração por link de anúncio do ML com preview ao vivo e publicação direta.

2. **Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/` — Porta 3333):**
   - **Tema Visual:** 🔥 Tipo Fogo (Vermelho/Laranja, Pokéball Fogo, Brasas & Fagulhas incandescentes 3D em 60fps).
   - **Função:** Extração de participantes de grupos em 1 clique, disparos em massa com proteção anti-ban (Spintax `{A|B|C}` e tags dinâmicas), simulador WhatsApp ao vivo e atendimento privado humanizado com **DeepSeek V4 via OpenCode Gateway**.
   - **Módulo Financeiro & Meta Ads:** Upload e auditoria de planilhas semanais do Meta Ads e faturas em PDF, cálculo de CPL, CTR, CPC, CPM, Ranking de Campanhas, DRE contábil diário e aplicação automática da regra de reinvestimento (70% do lucro para novas campanhas / 30% distribuição).
   - **Meta Cloud API & Utility Templates:** Disparo oficial via Cloud API com templates de serviço (`UTILITY` a ~R$ 0,18).

3. **Ponte Interna Docker (`promo_network`):**
   - Comunicação autenticada via token (`X-Internal-Token`) enviando ofertas replicadas diretamente para a esteira do Bot Disparador (`/api/internal/oferta`).

---

## 🌐 2. Acessos Oficiais em Produção (VPS HostGator)

| Módulo | URL em Produção | Tema Visual | Credenciais Padrão |
| :--- | :--- | :--- | :--- |
| **Réplica Promo Cockpit** | [http://108.174.145.77:3000](http://108.174.145.77:3000) | 🌊 Tipo Água (Azul + Gotículas 3D) | Usuário: `admin`<br>Senha: `promo2026` |
| **Disparador Pro & IA** | [http://108.174.145.77:3333](http://108.174.145.77:3333) | 🔥 Tipo Fogo (Vermelho + Brasas 3D) | Usuário: `admin`<br>Senha: `promo2026` |
| **Painel Coolify** | [http://108.174.145.77:8000](http://108.174.145.77:8000) | ⚙️ Gestão de Containers | Autenticado por Token |

> **Webhook de Deploy Contínuo (Coolify):**
> `POST http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra`  
> Header: `Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed`

---

## 🎨 3. Design System & Identidade Visual

Ambos os cockpits seguem uma estética dark moderna inspirada nos elementos do Pokémon TCG:
- **Tipografia Unificada:**
  - **Títulos e Headings:** `Outfit` (pesos 400, 500, 600, 700).
  - **Corpo e Dados:** `Inter` (pesos 300 a 700).
- **Glassmorphism & Legibilidade:**
  - Todos os cards, modais e cabeçalhos possuem fundo semi-opaco com `backdrop-filter: blur(16px)` para garantir contraste e legibilidade perfeita.
  - O canvas de partículas opera em `z-index: 0` com `pointer-events: none` e `mix-blend-mode: screen`, sem poluição visual.
- **Navegação Sem Duplicidade:**
  - O botão de alternância entre sistemas (`[🔥 Disparador Pro]` no Réplica e `[💧 Replicador Pro]` no Disparador) está posicionado no Top Header à direita, resolvendo dinamicamente o protocolo e hostname atual.
  - A barra lateral (Sidebar) é estritamente reservada à navegação interna de cada módulo.

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
