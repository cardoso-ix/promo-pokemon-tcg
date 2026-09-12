# Guia de Deploy em Nuvem 24/7 (Railway e Render)

Este guia explica como manter as duas aplicações (**Promo Réplica** e **Bot Disparador & IA**) rodando permanentemente na nuvem, permitindo que você acesse ambos os painéis de qualquer lugar (computador ou celular) sem precisar manter seu computador ligado.

---

## 📦 Estrutura dos Serviços

O repositório possui dois serviços independentes:

1. **Replicador de Ofertas (`app/`):**
   - Porta interna: `3000`
   - Dockerfile: `Dockerfile` (raiz)
   - Volume de persistência: `/app/data` (salva `replica.db` e sessão do WhatsApp)

2. **Bot Disparador & Atendimento IA (`bot-disparador/`):**
   - Porta interna: `3333`
   - Dockerfile: `bot-disparador/Dockerfile`
   - Volume de persistência: `/app/data` (salva `disparador.db` e sessão do WhatsApp)

---

## 🚂 Opção 1: Deploy no Railway (Mais Rápido e Recomendado)

No Railway, você pode ter os **dois serviços rodando lado a lado no mesmo projeto**:

### Parte A: Subir o Replicador de Ofertas
1. Acesse **[railway.app](https://railway.app)** e faça login com seu **GitHub**.
2. Clique em **+ New Project** ➔ **Deploy from GitHub repo** ➔ Escolha:
   👉 `cardoso-ix/promo-pokemon-tcg`
3. O Railway iniciará o build do Replicador automaticamente usando o `Dockerfile` raiz.
4. **Adicionar Volume Persistente:**
   - Clique no serviço ➔ **Settings** ➔ seção **Volumes** ➔ **+ Add Volume**.
   - No campo **Mount Path**, digite:
     ```text
     /app/data
     ```
5. **Gerar Link de Acesso Público:**
   - Em **Settings** ➔ seção **Networking** ➔ **Generate Domain**.
   - Pronto! Você terá seu link HTTPS para o Replicador (ex: `https://promo-replica.up.railway.app`).

---

### Parte B: Subir o Bot Disparador & IA (No mesmo projeto do Railway)
1. No mesmo painel do seu projeto no Railway, clique no botão **+ Create** (ou **+ New**) no canto superior direito.
2. Selecione **GitHub Repo** ➔ Escolha o mesmo repositório:
   👉 `cardoso-ix/promo-pokemon-tcg`
3. Clique no novo serviço gerado ➔ abra a aba **Settings**:
   - Em **Service Name**, renomeie para: `bot-disparador`
   - Na seção **Build**, encontre o campo **Root Directory** e preencha:
     ```text
     /bot-disparador
     ```
   - Ou no campo **Dockerfile Path**, aponte para:
     ```text
     bot-disparador/Dockerfile
     ```
4. **Adicionar Volume Persistente para o Disparador:**
   - Na aba **Settings** ➔ seção **Volumes** ➔ **+ Add Volume**.
   - No campo **Mount Path**, digite:
     ```text
     /app/data
     ```
   *(Isso garante que a sessão do chip do disparador e o banco de leads fiquem 100% salvos)*.
5. **Gerar Link de Acesso Público:**
   - Em **Settings** ➔ **Networking** ➔ **Generate Domain**.
   - Pronto! Você terá o link HTTPS do seu **Disparador & IA** no ar!

---

## 🌐 Opção 2: Deploy no Render via Blueprint

O repositório já inclui o arquivo [`render.yaml`](../render.yaml) configurado para criar automaticamente os dois serviços:

1. Acesse **[render.com](https://render.com)** e faça login com o **GitHub**.
2. Clique em **New +** ➔ **Blueprint**.
3. Selecione o repositório `cardoso-ix/promo-pokemon-tcg`.
4. O Render lerá o `render.yaml` e provisionará automaticamente:
   - `promo-replica-bot` (Porta 3000 + disco de 1GB)
   - `bot-disparador-ia` (Porta 3333 + disco de 1GB)
5. Clique em **Apply** e acesse as URLs geradas pelo Render!

---

## 🐳 Opção 3: Rodar os dois via Docker em VPS

Se você possui uma VPS Linux (Hostinger, DigitalOcean, Hetzner, AWS, etc.):

```bash
# Clonar o repositório na VPS
git clone https://github.com/cardoso-ix/promo-pokemon-tcg.git
cd promo-pokemon-tcg

# Subir os dois serviços em background
docker compose up -d --build
```
- Replicador ativo em: `http://IP-DA-VPS:3000`
- Disparador ativo em: `http://IP-DA-VPS:3333`
