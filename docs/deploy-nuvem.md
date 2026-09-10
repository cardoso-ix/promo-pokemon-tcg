# Guia de Deploy em Nuvem 24/7 (Railway e Render)

Este guia explica como colocar a **Promo Réplica** para rodar permanentemente na nuvem, permitindo que você acesse o painel de qualquer lugar (computador ou celular) sem precisar manter seu PC ligado.

---

## 🚂 Opção 1: Deploy no Railway (Mais Rápido e Recomendado)

O Railway é a melhor plataforma para containers com WhatsApp (Baileys) e SQLite, pois possui suporte nativo a volumes persistentes rápidos e geração de domínio HTTPS instantâneo.

### Passo a Passo:

1. Acesse **[railway.app](https://railway.app)** e entre com a sua conta do **GitHub**.
2. Clique no botão **+ New Project**.
3. Selecione **Deploy from GitHub repo** e escolha o repositório:
   👉 `cardoso-ix/promo-pokemon-tcg`
4. O Railway iniciará a criação do serviço detectando automaticamente o nosso [`Dockerfile`](../Dockerfile) e [`railway.json`](../railway.json).
5. **Passo Fundamental (Volume Persistente do WhatsApp)**:
   - Clique no cartão do seu serviço ➔ aba **Settings**.
   - Role a página até a seção **Volumes** e clique em **+ Add Volume**.
   - No campo **Mount Path**, digite exatamente:
     ```text
     /app/data
     ```
   - *Por que isso é essencial?* Esse volume salva a sessão do seu WhatsApp (`auth_baileys`) e o banco de dados das rotas (`replica.db`), garantindo que você nunca seja desconectado.
6. **Gerar Link de Acesso**:
   - Ainda na aba **Settings**, role até a seção **Networking**.
   - Clique em **Generate Domain**.
   - O Railway fornecerá um link público e seguro, por exemplo:
     `https://promo-replica-bot-production.up.railway.app`
7. **Conectar o WhatsApp**:
   - Abra esse link no seu navegador.
   - O painel exibirá o QR Code de conexão.
   - No seu celular, abra o WhatsApp ➔ **Aparelhos Conectados** ➔ **Conectar um aparelho** e aponte para a tela.
   - Pronto! Conectado 24 horas por dia na nuvem.

---

## 🌐 Opção 2: Deploy no Render

1. Acesse **[render.com](https://render.com)** e faça login com o **GitHub**.
2. Clique em **New +** ➔ **Blueprint** (ele usará nosso [`render.yaml`](../render.yaml) automaticamente) ou **Web Service**.
3. Selecione o repositório `cardoso-ix/promo-pokemon-tcg`.
4. Em **Disks**, confirme a montagem de um disco com tamanho de 1 GB no caminho:
   ```text
   /app/data
   ```
5. Clique em **Apply** / **Create Web Service**.
6. Acesse a URL gerada pelo Render (`https://promo-replica-bot.onrender.com`), escaneie o QR Code e utilize o painel de qualquer lugar.
