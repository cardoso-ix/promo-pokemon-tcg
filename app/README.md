# 💧 Replicador de Ofertas — Promo Pokémon TCG (`app/`)

Módulo autônomo responsável pelo monitoramento contínuo de grupos de ofertas de Pokémon TCG, interceptação de links concorrentes, conversão para links de afiliados oficiais do Mercado Livre com encurtamento `meli.la`, scraping de imagens em 2X e replicação nos grupos VIP de destino.

---

## 🚀 Como Iniciar

### Desenvolvimento Local
```bash
# A partir da pasta /app:
npm install
npm run dev
```
O painel estará disponível em: 👉 **`http://localhost:3000`**

### Execução de Testes Unitários (60 Testes)
```bash
npm test
```
*Garante 100% de integridade em regex de preços, extração de slugs de cards, higienização anti-spam, agendador de abertura e tokens HMAC.*

### Produção (HostGator VPS + Coolify)
- **URL em Produção:** 👉 **`http://108.174.145.77:3000`**
- **Credenciais Padrão:** `admin` / `promo2026`
- **Volume Persistente:** `/app/data` montado no Named Volume `promo_replica_data` (preserva `auth_baileys/` e `replica.db`).

---

## 🎨 Design System & Identidade Visual
- **Tema:** 🌊 **Tipo Água Pokémon TCG** (Tons de Azul Oceânico `#0284c7`, Cyan Elétrico `#00e5ff` e Fundo `#050b14`).
- **Efeitos de Fundo:** Motor Canvas 60fps com **Bolhas de Água Cristalina 3D** (reflexo especular de luz) e **Orbes de Orvalho Luminescentes** com `mix-blend-mode: screen`.
- **Tipografia:** `Outfit` (títulos) e `Inter` (corpo e formulários).
- **Glassmorphism:** Cards com `backdrop-filter: blur(16px)` para leitura 100% nítida e proteção visual.

---

## ⚙️ Principais Funcionalidades

1. **Monitoramento & Conversão de Afiliados:**
   - Detecta links do Mercado Livre (`mercadolivre.com`, `meli.la`, vitrines e cupons).
   - Injeta credenciais de afiliado oficiais com tokens `matt_word` e `matt_tool`.
   - Gera links curtos oficiais `https://meli.la/xxxxxx` via cookie de sessão.
   - **Cookie Sentinel:** Monitora a validade do cookie a cada 45 minutos e alerta no cockpit se expirar.

2. **Guardião de Nicho Pokémon TCG:**
   - Filtro inteligente que aceita cartas, boosters, boxes, fichários, decks e sleeves (Pokémon, Magic, Yu-Gi-Oh!, One Piece) e descarta produtos fora do nicho colecionável.

3. **Gerador de Anúncios Manual:**
   - Permite colar qualquer link de produto ou cupom, puxar foto oficial 2X HD do Mercado Livre e disparar nos grupos com 1 clique.
   - Inclui barra de pesquisa rápida para filtrar grupos de destino.

4. **Sincronização com Google Planilhas ("produtos tcg valores"):**
   - Registra automaticamente cada oferta replicada com Data/Hora, Título do Produto, Preço De/Por e Link Afiliado via Webhook Apps Script.

5. **Mensagem Matinal de Abertura (07:00 AM):**
   - Dispara automaticamente todas as manhãs no horário oficial de Brasília uma mensagem calorosa agradecendo aos membros e anunciando o início do rastreamento de ofertas do dia.

---

## 📁 Estrutura de Diretórios

```text
app/
├── src/
│   ├── core/                  # Regras de negócio
│   │   ├── affiliate.ts       # Encurtador meli.la e construtor de links
│   │   ├── cleaner.ts         # Remoção de spams e assinaturas concorrentes
│   │   ├── offerExtractor.ts  # Regex de preços, parcelamento e cupons
│   │   ├── tcgGuard.ts        # Filtro de nicho Pokémon TCG
│   │   ├── templateFormatter.ts # Templates dinâmicos de mensagem
│   │   └── scheduler.ts       # Mensagem de abertura matinal
│   ├── db/
│   │   └── index.ts           # Banco SQLite better-sqlite3 (replica.db)
│   ├── public/                # Cockpit Web (HTML5/CSS3/JS Vanilla)
│   ├── web/
│   │   ├── server.ts          # Servidor Fastify e rotas REST/WebSocket
│   │   └── auth.ts            # Autenticação HMAC-SHA256
│   └── whatsapp/
│       └── client.ts          # Conector Baileys Multi-Device e Watchdog
└── test/                      # 60 testes unitários em Node.js Test Runner
```
