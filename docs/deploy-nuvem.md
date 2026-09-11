# Guia de Deploy em Nuvem 24/7 (Railway e Render)

Este guia explica como manter a **Promo Réplica** rodando permanentemente na nuvem, permitindo que você acesse o painel de qualquer lugar (computador ou celular) sem precisar manter seu computador ligado.

---

## 🚂 Opção 1: Deploy no Railway (Mais Rápido e Recomendado)

O Railway é a plataforma ideal para este projeto, pois suporta compilação direta via Dockerfile, volumes persistentes NVMe ultrarrápidos e geração instantânea de domínio com HTTPS.

### Passo a Passo:

1. Acesse **[railway.app](https://railway.app)** e faça login com sua conta do **GitHub**.
2. Clique no botão **+ New Project**.
3. Selecione **Deploy from GitHub repo** e escolha o repositório:
   👉 `cardoso-ix/promo-pokemon-tcg`
4. O Railway detectará automaticamente o [`Dockerfile`](../Dockerfile) e iniciará o build.
5. **Passo Fundamental — Montagem do Volume Persistente**:
   - Clique no cartão do seu serviço ➔ aba **Settings**.
   - Role a página até a seção **Volumes** e clique em **+ Add Volume**.
   - No campo **Mount Path**, digite exatamente:
     ```text
     /app/data
     ```
   - *Por que isso é essencial?* Esse volume salva a sessão do seu WhatsApp (`auth_baileys`) e o banco de dados das rotas (`replica.db`), garantindo que você nunca seja desconectado mesmo em novos deploys.
6. **Gerar Link de Acesso Público**:
   - Ainda na aba **Settings**, role até a seção **Networking**.
   - Clique em **Generate Domain**.
   - O Railway fornecerá um link público seguro, por exemplo:
     `https://promo-replica-bot-production-7d52.up.railway.app`
7. **Conectar o WhatsApp**:
   - Abra esse link no seu navegador (computador ou celular).
   - O painel exibirá o QR Code de conexão em tempo real via WebSocket.
   - No seu celular, abra o WhatsApp ➔ **Aparelhos Conectados** ➔ **Conectar um aparelho** e escaneie o código.
   - Pronto! Conectado 24 horas por dia na nuvem.

---

## 🌐 Opção 2: Deploy no Render

1. Acesse **[render.com](https://render.com)** e faça login com o **GitHub**.
2. Clique em **New +** ➔ **Blueprint** (ele usará nosso [`render.yaml`](../render.yaml) automaticamente) ou **Web Service**.
3. Selecione o repositório `cardoso-ix/promo-pokemon-tcg`.
4. Em **Disks**, adicione um disco com tamanho de 1 GB no caminho:
   ```text
   /app/data
   ```
5. Clique em **Create Web Service**.
6. Acesse a URL gerada pelo Render, escaneie o QR Code e configure as rotas normalmente.
