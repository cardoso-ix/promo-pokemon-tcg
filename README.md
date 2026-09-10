# Promo Pokémon TCG — Réplica Autônoma de Promoções

Aplicação moderna, leve e 100% autônoma em **Node.js e TypeScript**, projetada para monitorar grupos de WhatsApp de ofertas de Pokémon TCG, substituir links de terceiros por links oficiais de afiliado do Mercado Livre com encurtamento `meli.la`, replicar fotos com alta fidelidade e republicar nos grupos de destino.

> **Evolução da Arquitetura (Setembro/2026):**
> O sistema antigo baseado em n8n e VPS Hostinger foi totalmente descontinuado. Agora o projeto roda de forma nativa e independente em um único processo local ultraleve com banco de dados SQLite e painel web integrado.

---

## 🚀 Funcionalidades Principais

1. **Monitoramento & Replicação em Tempo Real**:
   - Conexão direta com o WhatsApp via biblioteca `@whiskeysockets/baileys`.
   - Rotas flexíveis (Muitos grupos de Origem ➔ Muitos grupos de Destino).
   - Suporte completo a mensagens temporárias (*ephemeral*), visualização única (*viewOnce*) e mensagens enviadas pelo próprio celular pareado (`deviceSentMessage`).

2. **Encurtamento Oficial `meli.la` & Troca de Afiliado**:
   - Integração com a API de Afiliados do Mercado Livre via cookie de sessão.
   - Gera links curtos oficiais `https://meli.la/xxxxxx`.
   - Fallback automático para link parametrizado direto (`matt_word` + `matt_tool`).
   - Limpeza inteligente de assinaturas concorrentes (`@rasgabooster.tcg`, hashtags) preservando quebras de linha e blocos de texto.

3. **Replicação Fiel de Mídias**:
   - Baixa e encaminha o buffer exato da foto enviada no WhatsApp.
   - Para posts somente texto que contenham anúncio do Mercado Livre, busca automaticamente a foto oficial do produto em alta resolução (**2X**).

4. **Cockpit & Dashboard Web em Tempo Real (`http://localhost:3000`)**:
   - Alternador Geral (Ligar / Desligar Esteira).
   - Gerenciamento de Rotas com lista de grupos sincronizados.
   - Configuração de tags de afiliado, cookies do Mercado Livre e teste de conexão com a API.
   - Feed de postagens ao vivo via WebSocket e histórico com filtros e paginação.

---

## 🛠️ Como Iniciar a Aplicação

### Opção 1: Via Scripts Rápidos (Recomendado)
- **`iniciar.bat`**: Inicia o servidor com terminal visível para acompanhar logs em tempo real.
- **`iniciar-segundo-plano.vbs`**: Inicia o servidor silenciosamente em segundo plano.
- **`parar.bat`**: Finaliza o servidor na porta 3000 caso queira reiniciar ou pausar.

### Opção 2: Via Linha de Comando (Terminal)
```bash
# Acessar a pasta da aplicação
cd app

# Instalar dependências (se for a primeira vez)
npm install

# Compilar TypeScript e assets
npm run build

# Iniciar o servidor
npm start
```

Após iniciar, acesse no seu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Testes Automatizados

A aplicação conta com suíte de testes unitários cobrindo conversão de links, limpeza de markdown e desembrulho de mídia WhatsApp:

```bash
cd app
npm test
```

---

## 📁 Estrutura do Repositório

```text
promo-pokemon-tcg/
├── app/                        # Código-fonte da aplicação autônoma
│   ├── src/
│   │   ├── config.ts           # Configurações de ambiente e caminhos
│   │   ├── core/
│   │   │   └── affiliate.ts    # Links, encurtador meli.la, scraper e regexes
│   │   ├── db/
│   │   │   └── database.ts     # Camada SQLite (rotas, configs, logs, chats)
│   │   ├── public/             # Frontend do dashboard (HTML, CSS, JS)
│   │   ├── web/
│   │   │   └── server.ts       # Servidor Fastify REST & WebSocket
│   │   ├── whatsapp/
│   │   │   └── client.ts       # Gerenciador Baileys WhatsApp
│   │   └── index.ts            # Ponto de entrada do sistema
│   ├── test/                   # Testes automatizados (Node Test Runner)
│   └── package.json
├── data/                       # Armazenamento local (ignorado pelo Git)
│   ├── replica.db              # Banco SQLite com suas configurações e rotas
│   └── auth_baileys/           # Sessão e chaves de autenticação do WhatsApp
├── docs/                       # Documentação histórica e regras de negócio
├── iniciar.bat                 # Inicializador padrão Windows
├── iniciar-segundo-plano.vbs   # Inicializador silencioso
└── parar.bat                   # Finalizador do processo
```
