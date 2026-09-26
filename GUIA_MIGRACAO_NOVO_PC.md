# 🚀 Guia de Migração e Inicialização em Novo Computador

Este guia prático foi elaborado para você **abrir o projeto em outro computador, rodar tudo em menos de 3 minutos e continuar desenvolvendo novas melhorias** com o máximo de conforto, segurança e produtividade.

---

## ⚡ Checklist Rápido de 3 Minutos (TL;DR)

1. **Instale o Node.js 20 LTS ou 22 LTS** no novo computador: 👉 [nodejs.org](https://nodejs.org/).
2. **Clone ou copie o repositório**:
   ```bash
   git clone https://github.com/cardoso-ix/promo-pokemon-tcg.git
   cd promo-pokemon-tcg
   ```
3. **Execute o Setup Automático**:
   - **No Windows:** Dê dois cliques em **`setup-novo-pc.bat`** (ou execute no terminal).
   - **No Linux / macOS:** Execute `./setup-novo-pc.sh` (ou `npm run setup`).
4. **Pronto!** Ambos os serviços estão com dependências instaladas, código compilado e 128 testes automatizados aprovados.
5. **Para começar a desenvolver com Hot Reload:**
   - Dê dois cliques em **`iniciar-dev.bat`**!

---

## 🛠️ 1. Pré-Requisitos do Sistema

Antes de começar no novo computador, certifique-se de ter:

| Requisito | Versão Recomendada | Como verificar | Download / Instalação |
| :--- | :--- | :--- | :--- |
| **Node.js** | **v20 LTS** ou **v22 LTS** | `node -v` | [nodejs.org](https://nodejs.org/) |
| **NPM** | **v10+** (incluso com o Node) | `npm -v` | Incluso no Node.js |
| **Git** | Qualquer versão moderna | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Editor** | VS Code / Antigravity / Cursor | — | Extensões úteis: *ESLint*, *Tailwind CSS* |

> [!NOTE]
> O projeto utiliza `better-sqlite3` que compila binários nativos de alta performance. O instalador do Node.js LTS no Windows já baixa os binários pré-compilados automaticamente sem necessidade de instalar compiladores C++.

---

## 💻 2. Como Rodar no Windows

### Método A: 100% Automático por Scripts (Recomendado)
1. **Primeira Vez no Computador**: Dê dois cliques em **`setup-novo-pc.bat`**.  
   *O script verifica o Node.js, cria seu `.env` inicial, instala as dependências dos dois módulos, compila o código e executa todos os 128 testes de sanidade.*
2. **Dia a Dia — Modo Desenvolvimento (Hot Reload)**: Dê dois cliques em **`iniciar-dev.bat`**.  
   *Abre duas janelas de comando dedicadas (Replicador na 3000 e Disparador na 3333). Qualquer alteração no código em `src/` reinicia o servidor instantaneamente.*
3. **Modo Produção Local**: Dê dois cliques em **`iniciar-tudo.bat`**.
4. **Para Encerrar Tudo**: Dê dois cliques em **`parar.bat`** (ele finaliza com segurança os processos nas portas 3000 e 3333).

### Método B: Pelo Terminal / VS Code
Você pode executar tudo direto da raiz do monorepo:
```bash
# 1. Instalar tudo e compilar
npm run setup

# 2. Executar testes de sanidade (128 testes)
npm test

# 3. Iniciar Replicador em modo desenvolvimento
npm run dev:app

# 4. Em outro terminal, iniciar Bot Disparador em modo desenvolvimento
npm run dev:bot
```

---

## 🍏 3. Como Rodar no Linux / macOS

1. No terminal, conceda permissão de execução aos scripts:
   ```bash
   chmod +x *.sh
   ```
2. Execute o setup completo:
   ```bash
   ./setup-novo-pc.sh
   ```
3. Inicie em modo desenvolvimento:
   ```bash
   ./iniciar-dev.sh
   ```
4. Para encerrar as portas:
   ```bash
   ./parar.sh
   ```

---

## 🌐 4. Acessando os Painéis no Navegador

Após iniciar os serviços, acesse localmente:

- 🌊 **Replicador de Ofertas (Tema Água):**  
  👉 **`http://localhost:3000`**
- 🔥 **Bot Disparador, Tráfego & Atendimento IA (Tema Fogo):**  
  👉 **`http://localhost:3333`**

### Credenciais Padrão de Acesso:
- **Usuário:** `admin` (ou `eduardo` se configurado no `.env`)
- **Senha:** `promo2026`

---

## 🔐 5. Variáveis de Ambiente (`.env`)

O script de setup cria automaticamente o arquivo `.env` na raiz a partir do `.env.example`. As principais chaves configuráveis são:

```env
# Acesso aos Cockpits Web
ADMIN_USER=admin
ADMIN_PASS=promo2026
SESSION_SECRET=coloque-uma-chave-longa-e-aleatoria-aqui-2026

# Integração entre Serviços
INTERNAL_API_KEY=promo-internal-key-2026
DISPARADOR_URL=http://localhost:3333
SYNC_DISPARADOR=true

# Replicador e Mercado Livre
PORT=3000
DATA_DIR=data
MATT_WORD=caed1312314
MATT_TOOL=96097202
MELI_COOKIE=

# Bot Disparador e IA DeepSeek (OpenCode Gateway)
DISPARADOR_PORT=3333
DEEPSEEK_API_KEY=sua-chave-opencode-ou-deepseek
DEEPSEEK_BASE_URL=https://opencode.ai/zen/go/v1
DEEPSEEK_MODEL=deepseek-v4-flash
```

---

## 🗄️ 6. Bancos de Dados e Sessões do WhatsApp

- **Onde ficam os dados locais?**
  - Replicador: pasta `app/data/` (`replica.db` e `auth_baileys/`).
  - Disparador: pasta `bot-disparador/data/` (`disparador.db`, `auth/` e `financas_uploads/`).
- **Preciso migrar o banco de dados?**
  - Não obrigatoriamente. O SQLite cria as tabelas automaticamente na primeira execução com todas as migrações aplicadas.
  - Se quiser continuar com o histórico exato do outro computador, basta copiar as pastas `data/` de um computador para o outro.
- **Conectando o WhatsApp no novo computador:**
  - Acesse a aba **📱 Conectar WhatsApp** em cada painel (`:3000` e `:3333`) e aponte a câmera do celular para ler o QR Code.

---

## 🔄 7. Fluxo de Trabalho Git (Sincronização entre PCs)

Para manter seu código sempre atualizado e subir melhorias com facilidade:

### Ao Iniciar o Trabalho no Novo Computador:
```bash
git pull origin main
```

### Ao Finalizar uma Melhoria / Nova Funcionalidade:
```bash
# 1. Rode os testes para garantir integridade
npm test

# 2. Adicione e commite as alterações (Conventional Commits)
git add .
git commit -m "feat: adicionar nova funcionalidade X"

# 3. Envie para o GitHub
git push origin main
```

### Acionar Deploy em Produção na VPS (HostGator + Coolify):
Após fazer `git push`, atualize a VPS com 1 comando:
```bash
curl -X POST "http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra" \
  -H "Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed"
```

---

## 🧪 8. Comandos Disponíveis na Raiz

| Comando | Descrição |
| :--- | :--- |
| `npm run setup` | Instala dependências de ambos os projetos e gera os builds. |
| `npm test` | Executa todos os **128 testes unitários** automatizados. |
| `npm run dev:app` | Inicia o Replicador em modo dev com hot reload (Porta 3000). |
| `npm run dev:bot` | Inicia o Bot Disparador em modo dev com hot reload (Porta 3333). |
| `npm run build:all` | Compila o TypeScript e sincroniza assets de ambos os módulos. |
| `npm run start:app` | Executa o build compilado do Replicador. |
| `npm run start:bot` | Executa o build compilado do Bot Disparador. |
