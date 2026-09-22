# 🔥 Bot Disparador & Atendimento IA — Pokémon TCG (`bot-disparador/`)

Plataforma profissional de **Captação de Leads de Grupos**, **Disparos em Massa Anti-Ban com Spintax** e **Atendimento Humanizado no Privado com Inteligência Artificial (DeepSeek V4 via OpenCode)**, desenvolvida sob medida para o ecossistema de **Pokémon TCG** com estética elemental **Tipo Fogo**.

---

## 🚀 Como Iniciar

### Desenvolvimento Local
```bash
# A partir da pasta /bot-disparador:
npm install
npm run dev
```
O painel estará disponível em: 👉 **`http://localhost:3333`**

### Execução de Testes Unitários (28 Testes)
```bash
npm test
```
*Garante 100% de integridade nos parsers de Spintax, auditoria Meta Shield, sanitização de números `@lid`, controle de delays variáveis e integração com DeepSeek IA.*

### Produção (HostGator VPS + Coolify)
- **URL em Produção:** 👉 **`http://108.174.145.77:3333`**
- **Credenciais Padrão:** `admin` / `promo2026`
- **Volume Persistente:** `/app/data` montado no Named Volume `bot_disparador_data` (preserva `auth/` e `disparador.db`).

---

## 🎨 Design System & Identidade Visual
- **Tema:** 🔥 **Tipo Fogo Pokémon TCG** (Tons de Vermelho Rubi `#ef4444`, Laranja Brasa `#f97316`, Dourado `#f59e0b` e Fundo `#0c0505`).
- **Efeitos de Fundo:** Motor Canvas 60fps com **Brasas Incandescentes 3D** (núcleo térmico dourado e halo rubi) e **Micro-fagulhas Cintilantes** com `mix-blend-mode: screen`.
- **Tipografia:** `Outfit` (títulos) e `Inter` (corpo e formulários).
- **Glassmorphism:** Cards com `backdrop-filter: blur(16px)` para leitura 100% nítida e proteção visual.
- **Top Header Switcher:** Botão `[💧 Replicador Pro]` no cabeçalho superior direito com resolução dinâmica para alternar instantaneamente para o Replicador (`:3000`).

---

## ⚙️ Principais Funcionalidades

1. **Captação & Extração Automática de Grupos:**
   - Sincroniza todos os grupos do chip conectado com 1 clique.
   - **Busca em Tempo Real:** Campo de busca rápida com filtro dinâmico ao selecionar grupos para criação de campanhas.
   - Extrai instantaneamente os números e nomes de todos os participantes de qualquer grupo com 1 clique, salvando-os na base de leads.

2. **Disparador em Massa com Proteção Anti-Ban:**
   - **Fator Humano Ativo:** Delays dinâmicos randômicos, pausas automáticas de descanso em blocos de envio e simulação de digitação.
   - **Motor Spintax `{A|B|C}`:** Variações infinitas de mensagens, evitando o filtro de spam da Meta.
   - **Tags Dinâmicas:** `{nome}`, `{saudacao}`, `{grupo}`, `{numero}`.
   - **Simulador do WhatsApp Ao Vivo:** Preview interativo lado a lado que reflete com perfeição balão, formatações e horário.

3. **Meta Shield — Auditor de Risco em Tempo Real:**
   - Score de risco de 0 a 100 para o template digitado.
   - Alerta termos comerciais agressivos que forçam cobrança de MARKETING na API oficial ou geram banimento no Baileys.
   - Reescritura inteligente com IA em 1 clique.

4. **Atendimento Inteligente com IA (DeepSeek V4 via OpenCode):**
   - Responde clientes no privado imitando um especialista amigável de Pokémon TCG.
   - Simulação realista de digitação (*delay humanizado* de 3 a 6 segundos).
   - Integração com o gateway OpenCode (`https://opencode.ai/zen/go/v1`) com modelos `deepseek-v4-pro` e `deepseek-v4-flash`.
   - Sandbox interativa para testar respostas da IA diretamente no navegador.

---

## 📁 Estrutura de Diretórios

```text
bot-disparador/
├── src/
│   ├── ai/                    # Atendimento inteligente com DeepSeek V4
│   │   ├── client.ts          # Chamadas OpenCode Gateway
│   │   └── prompts.ts         # Persona especialista Pokémon TCG
│   ├── core/                  # Regras anti-ban e templates
│   │   ├── metaShield.ts      # Auditor de risco anti-ban
│   │   ├── queue.ts           # Fila de envio com fator humano
│   │   └── spintax.ts         # Parser Spintax combinatório
│   ├── db/
│   │   └── index.ts           # Banco SQLite better-sqlite3 (disparador.db)
│   ├── public/                # Cockpit Web (HTML5/CSS3/JS Vanilla)
│   ├── web/
│   │   ├── server.ts          # Servidor Fastify e rotas REST/WebSocket
│   │   └── auth.ts            # Autenticação HMAC-SHA256
│   └── whatsapp/
│       └── client.ts          # Conector Baileys para chip de disparos
└── test/                      # 28 testes unitários em Node.js Test Runner
```
