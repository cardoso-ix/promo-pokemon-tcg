# Runbook — Manual de Operação e Manutenção

Guia prático para operação diária, manutenção e gerenciamento da Promo Réplica.

---

## 1. Operação em Nuvem (Railway — 24/7)

### 1.1. Acessando o Painel
- **URL Pública**: `https://promo-replica-bot-production-7d52.up.railway.app` (ou o domínio personalizado configurado nas configurações de Networking do Railway).
- Pode ser acessado diretamente do computador, tablet ou celular.

### 1.2. Atualização de Código
- O Railway está conectado diretamente à branch `main` do GitHub.
- Toda alteração enviada com `git push origin main` dispara uma nova compilação e deploy automático em menos de 2 minutos.
- O volume persistente em `/app/data` garante que o WhatsApp **não desconecte** durante os redeploys.

### 1.3. Reiniciar o Serviço
- Se necessário forçar um reinício, acesse o painel do Railway ➔ clique no serviço `promo-replica-bot` ➔ clique nos três pontinhos no canto superior direito ➔ **Restart**.

---

## 2. Operação Local (Windows)

Caso queira rodar uma instância de testes ou operar localmente:

| Ação | Como Fazer |
| --- | --- |
| **Iniciar com Logs Visíveis** | Duplo clique em `iniciar.bat`. Abre uma janela preta do prompt exibindo todas as mensagens e logs. |
| **Iniciar Silencioso (Background)** | Duplo clique em `iniciar-segundo-plano.vbs`. Roda o servidor sem nenhuma janela aberta. |
| **Parar a Aplicação** | Duplo clique em `parar.bat`. Localiza o processo na porta 3000 e o encerra com segurança. |
| **Acessar o Painel Local** | Abra `http://localhost:3000` no seu navegador. |

---

## 3. Gestão da Conexão do WhatsApp

### 3.1. Primeira Conexão (Pareamento)
1. Abra o painel no navegador.
2. O cartão **Status WhatsApp** exibirá o **QR Code**.
3. No celular com o chip de envio, abra o WhatsApp ➔ vá em **Aparelhos Conectados** ➔ toque em **Conectar um aparelho**.
4. Aponte a câmera para o QR Code no painel. Em instantes o status mudará para **Conectado** (verde).

### 3.2. Trocar de Número ou Resetar Conexão
- No celular: acesse Aparelhos Conectados, toque na sessão do bot e escolha **Desconectar**.
- Ou no servidor: exclua o conteúdo da pasta `data/auth_baileys/` e recarregue o painel para gerar um novo QR Code.

---

## 4. Gestão de Rotas de Replicação

1. No painel, acesse a aba **Rotas**.
2. Clique em **+ Nova Rota**:
   - **Nome**: Dê um nome descritivo (ex: "Ofertas TCG ➔ Grupo VIP").
   - **Grupos de Origem**: Marque os grupos de onde o bot deve capturar mensagens.
   - **Grupos de Destino**: Marque os grupos para onde as ofertas tratadas devem ser enviadas.
3. Clique em **Salvar Rota**.
4. Utilize a chave de ativação individual de cada rota para pausar ou retomar o envio a qualquer momento.

---

## 5. Atualização do Cookie do Mercado Livre

O encurtador oficial `meli.la` utiliza um cookie de sessão de afiliado para autenticar requisições na API do Mercado Livre. Caso o cookie expire:

1. No seu navegador, faça login no [Mercado Livre](https://www.mercadolivre.com.br).
2. Pressione `F12` para abrir o DevTools ➔ vá na aba **Application** (ou Armazenamento) ➔ **Cookies** ➔ selecione `mercadolivre.com.br`.
3. Copie o valor do cookie principal de sessão (ou copie todo o cabeçalho `cookie` de uma requisição de rede).
4. No Cockpit da Réplica, vá na aba **Configurações**.
5. Cole no campo **Cookie de Sessão do Mercado Livre** e clique no botão **Testar Cookie**.
6. O painel exibirá imediatamente o resultado:
   - ✅ *"Cookie válido! API respondeu com sucesso."*
   - ❌ *"Falha na validação do cookie."*
7. Clique em **Salvar Configurações**.
