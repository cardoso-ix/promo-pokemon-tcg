# Runbook — Manual de Operação e Manutenção

Guia prático para a operação diária, manutenção e gerenciamento das duas aplicações em produção na nuvem (VPS HostGator + Coolify).

---

## 1. Operação em Produção (VPS HostGator — 24/7)

Tanto o **Replicador de Ofertas** quanto o **Bot Disparador & Atendimento IA** rodam de forma autônoma e ininterrupta na VPS HostGator (`108.174.145.77`), acessíveis de qualquer navegador (computador, tablet ou celular), sem que você precise manter seu computador ligado.

### 1.1. Painel do Replicador de Ofertas
- **Acesso Online**: 👉 **`http://108.174.145.77:3000`**
- **Tema Visual**: 🌊 **Tipo Água Pokémon TCG** (Azul/Cyan, Gotículas 3D, Fundo Atmosférico).
- **Função**: Controla a replicação de ofertas de grupos concorrentes para os seus grupos VIP, encurtamento oficial `meli.la` e fotos oficiais 2X do Mercado Livre.
- **Autenticação**: Protegido por login e senha. Sessão criptografada persistente de 30 dias.
- **Pareamento do WhatsApp**: Na aba **Conectar WhatsApp**, escaneie o QR Code. Se precisar redefinir a conexão a qualquer momento, clique no botão **🔄 Reiniciar Sessão / Gerar Novo QR Code**.

### 1.2. Painel do Bot Disparador & Atendimento IA
- **Acesso Online**: 👉 **`http://108.174.145.77:3333`**
- **Tema Visual**: 🔥 **Tipo Fogo Pokémon TCG** (Vermelho/Laranja, Brasas 3D, Fundo Atmosférico).
- **Função**: Extração de leads de grupos com 1 clique, disparos automáticos em massa com proteção anti-ban (Spintax), simulador WhatsApp ao vivo e atendimento privado automático com DeepSeek V4.
- **Autenticação**: Protegido por login e senha. Sessão criptografada persistente de 30 dias.

### 1.3. Credenciais de Acesso (Login & Senha)
Ambos os painéis utilizam controle de acesso por credenciais seguras e tokens assinados digitalmente com HMAC-SHA256:
- **Usuário padrão**: `admin`
- **Senha padrão**: `promo2026`
- **Duração da Sessão**: 30 dias em cookie seguro (`HttpOnly; SameSite=Lax`).
- **Botão Sair**: Disponível na barra superior de ambos os painéis para encerramento imediato de sessão.

### 1.4. Gerador Manual de Anúncios por Link (No Painel Replicador)
- **Acesso**: Aba **⚡ Gerador de Anúncios** no Cockpit do Replicador.
- **Como Usar**:
  1. Cole o link de afiliado ou produto do Mercado Livre (aceita `https://mercadolivre.com/sec/...`, `meli.la` ou link direto).
  2. *(Opcional)* Preencha o campo de **Cupom de Desconto** (ex: `APP10`) e os campos de preço (De / Por).
  3. Clique em **⚡ Puxar Dados & Gerar Anúncio**: o sistema extrai a foto 2X HD do Mercado Livre e monta a copy persuasiva para Pokémon TCG.
  4. Marque os grupos de destino desejados (com auxílio da barra de busca de grupos).
  5. Clique em **🚀 Publicar no WhatsApp** para disparar a foto com a legenda com 1 clique!

### 1.5. Protocolo de Reativação Rápida em 30s (Pelo Celular ou Computador)
Se o WhatsApp desconectar ou se você trocar de aparelho, você pode restabelecer tudo em **menos de 30 segundos** diretamente pelo celular:
1. Abra no navegador do seu smartphone:  
   👉 **`http://108.174.145.77:3000`** (ou `:3333` para o disparador).
2. Se o status no topo indicar 🔴 **Desconectado** ou 🟡 **Aguardando QR**:
   * Toque na aba **📱 Conectar WhatsApp**.
   * Se o QR Code estiver visível, aponte a câmera do WhatsApp (**Aparelhos Conectados ➔ Conectar Aparelho**).
   * Se a sessão parecer travada ou o WhatsApp não conectar de primeira: toque no botão **🔄 Reiniciar Sessão / Gerar Novo QR Code**. O robô faz a limpeza das chaves no servidor e gera um QR novo em 2 segundos.

---

## 2. Deploy Contínuo via Coolify (CI/CD)

- Repositório GitHub Oficial: `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`).
- Após realizar `git push origin main`, acione o deploy instantâneo na VPS via Webhook:
```bash
curl -X POST "http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra" \
  -H "Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed"
```
- O Coolify recompila as imagens Docker, aplica as novas alterações e reativa os serviços sem derrubar as sessões do WhatsApp.

---

## 3. Operação Local no Notebook

Caso queira realizar testes offline ou trabalhar em novas funcionalidades locais:

| Ação | Comando / Script | Acesso Local |
| --- | --- | --- |
| Iniciar Ambos os Módulos | `iniciar-tudo.bat` | Portas 3000 e 3333 |
| Iniciar Apenas Replicador | `cd app && npm run dev` | `http://localhost:3000` |
| Iniciar Apenas Disparador | `cd bot-disparador && npm run dev` | `http://localhost:3333` |
| Executar Testes Automatizados | `npm test --prefix app` e `npm test --prefix bot-disparador` | Terminal |
