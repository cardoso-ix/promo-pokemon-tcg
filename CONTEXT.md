# 🧠 CONTEXT.md — Guia de Contexto & Fonte Única da Verdade

> **Nota para IAs e Desenvolvedores:** Este arquivo sintetiza todo o ecossistema do repositório `promo-pokemon-tcg`. Leia este documento antes de realizar qualquer alteração, refatoração ou inclusão de código.

---

## 🎯 1. Visão Geral da Plataforma

A **Promo Pokémon TCG** é um ecossistema profissional em **Node.js 22 LTS e TypeScript**, construído para automação inteligente de vendas, prospecção e engajamento no mercado de Pokémon TCG no WhatsApp.

A plataforma opera **24/7 em produção na VPS HostGator (`108.174.145.77`) gerenciada pelo Coolify**, composta por dois sistemas desacoplados que trabalham em harmonia:

1. **Replicador de Ofertas (`app/` — Porta 3000):**
   - **Tema Visual:** 🌊 Tipo Água (Azul Cyan, Pokéball Água, Gotículas/Bolhas 3D animadas em 60fps).
   - **Função:** Monitora grupos de ofertas concorrentes, intercepta links, higieniza mensagens, encurta links com a API oficial do Mercado Livre (`https://meli.la/xxxxxx`), baixa fotos oficiais em 2X e replica nos grupos VIP de destino.
   - **Integração Google Planilhas:** Registra automaticamente na planilha *"produtos tcg valores"* cada oferta postada via Webhook Google Apps Script.
   - **Mensagem Matinal de Abertura:** Posta automaticamente às 07:00 AM (Horário de Brasília) mensagem de bom dia com incentivo de crescimento do grupo.

2. **Bot Disparador, Prospecção & Atendimento IA (`bot-disparador/` — Porta 3333):**
   - **Tema Visual:** 🔥 Tipo Fogo (Vermelho/Laranja, Pokéball Fogo, Brasas & Fagulhas incandescentes 3D em 60fps).
   - **Função:** Extração de participantes de grupos em 1 clique, disparos em massa com proteção anti-ban (Spintax `{A|B|C}` e tags dinâmicas), simulador WhatsApp ao vivo e atendimento privado humanizado com **DeepSeek V4 via OpenCode Gateway**.

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
  - *Obs:* Fontes antigas (`Plus Jakarta Sans`, `Teko`) foram 100% removidas.
- **Glassmorphism & Legibilidade:**
  - Todos os cards, modais e cabeçalhos possuem fundo semi-opaco com `backdrop-filter: blur(16px)` para garantir contraste e legibilidade perfeita.
  - O canvas de partículas opera em `z-index: 0` com `pointer-events: none` e `mix-blend-mode: screen`, sem poluição visual.
- **Navegação Sem Duplicidade:**
  - O botão de alternância entre sistemas (`[🔥 Disparador Pro]` no Réplica e `[💧 Replicador Pro]` no Disparador) está posicionado exclusivamente no Top Header à direita, resolvendo dinamicamente o protocolo e hostname atual.
  - A barra lateral (Sidebar) é estritamente reservada à navegação interna de cada módulo.
- **Filtro de Grupos em Tempo Real:**
  - Presente nos modais de criação de campanhas (Disparador), rotas de grupos e gerador de anúncios (Replicador).

---

## 💻 4. Como Desenvolver e Testar Localmente (Notebook)

### Pré-requisitos
- Node.js 20+ ou 22 LTS.
- Git.

### Instalação de Dependências
```bash
# Na raiz do projeto:
npm install --prefix app
npm install --prefix bot-disparador
```

### Execução dos Testes Automatizados (88 Testes)
Antes de comitar qualquer alteração, certifique-se de que os testes passam 100%:
```bash
# Testes do Replicador (60 testes):
npm test --prefix app

# Testes do Disparador (28 testes):
npm test --prefix bot-disparador
```

### Início Local dos Servidores
- **No Windows (Scripts Prontos):**
  - `iniciar-tudo.bat` — Inicia os dois serviços simultaneamente nas portas 3000 e 3333.
  - `iniciar.bat` — Inicia apenas o Replicador (`:3000`).
  - `iniciar-disparador.bat` — Inicia apenas o Disparador (`:3333`).
  - `parar.bat` — Encerra as instâncias locais.
- **Via Terminal:**
  ```bash
  # Terminal 1: Replicador
  cd app && npm run dev

  # Terminal 2: Disparador
  cd bot-disparador && npm run dev
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
│   └── test/                         # 60 testes unitários automatizados
│
├── bot-disparador/                   # Módulo Disparador & Atendimento IA (:3333)
│   ├── src/
│   │   ├── ai/                       # Integração DeepSeek V4 via OpenCode Gateway
│   │   ├── core/                     # Motor Spintax, sanitizador anti-ban e templates
│   │   ├── db/                       # Banco SQLite better-sqlite3 (disparador.db)
│   │   ├── public/                   # Frontend do Cockpit (index.html, style.css, app.js, login.html)
│   │   ├── web/                      # Rotas da API Fastify e autenticação
│   │   └── whatsapp/                 # Conector Baileys para chip de prospecção
│   └── test/                         # 28 testes unitários automatizados
│
├── docs/                             # Documentação técnica detalhada
│   ├── arquitetura.md                # Arquitetura completa da VPS HostGator e Coolify
│   ├── estado-atual.md               # Status de produção e decisões vigentes
│   ├── runbook.md                    # Manual operacional de uso dos cockpits
│   ├── troubleshooting.md            # Diagnóstico de incidentes
│   └── google-sheets-integracao.md   # Integração com o Google Planilhas
│
├── docker-compose.coolify.yml        # Orquestração oficial de produção no Coolify
├── README.md                         # Documentação principal do repositório
└── CONTEXT.md                        # Este guia
```

---

## 🔒 6. Regras de Ouro para Próximos Ajustes
1. **Nunca use `any` no TypeScript** (`strict: true` ativado em ambos os módulos).
2. **Mantenha a simetria visual:** Qualquer melhoria de layout ou UX aplicada em um dos cockpits deve ser espelhada no outro (mantendo as cores temáticas: Água no Replicador e Fogo no Disparador).
3. **Mantenha 100% dos 88 testes verdes** antes de fazer `git push`.
4. **Deploy na VPS:** Após `git push origin main`, acione o webhook do Coolify via curl/Invoke-RestMethod para publicar as alterações na VPS HostGator.
