# Runbook — Manual de Operação e Manutenção

Guia prático para a operação diária, manutenção e gerenciamento das duas aplicações em produção na nuvem.

---

## 1. Operação em Nuvem (Railway — 24/7)

Tanto o **Replicador de Ofertas** quanto o **Bot Disparador & Atendimento IA** rodam de forma autônoma e ininterrupta no Railway, acessíveis de qualquer navegador (computador, tablet ou celular), sem que você precise manter seu computador ligado.

### 1.1. Painel do Replicador de Ofertas
- **Acesso Online**: `https://promo-replica-bot-production-7d52.up.railway.app`
- **Função**: Controla a replicação de ofertas de grupos concorrentes para os seus grupos VIP, encurtamento oficial `meli.la` e fotos oficiais 2X do Mercado Livre.
- **Autenticação**: Protegido por login e senha. Sessão criptografada persistente de 30 dias.

### 1.2. Painel do Bot Disparador & Atendimento IA
- **Acesso Online**: Link público HTTPS gerado no seu projeto do Railway para o serviço `bot-disparador`.
- **Função**: Extração de leads de grupos com 1 clique, disparos automáticos em massa com proteção anti-ban (Spintax), simulador WhatsApp ao vivo e atendimento privado automático com DeepSeek V4.
- **Autenticação**: Protegido por login e senha. Sessão criptografada persistente de 30 dias.

### 1.3. Credenciais de Acesso (Login & Senha)
Ambos os painéis utilizam controle de acesso por credenciais seguras e tokens assinados digitalmente com HMAC-SHA256:
- **Usuário padrão**: `eduardo`
- **Senha padrão**: `04052001`
- **Duração da Sessão**: 30 dias em cookie seguro (`HttpOnly; SameSite=Lax`).
- **Botão Sair**: Disponível na barra superior de ambos os painéis para encerramento imediato de sessão.
- **Personalização de Credenciais (Opcional)**: Caso queira alterar no Railway, basta configurar as variáveis no painel do Railway:
  - `ADMIN_USER`: seu novo login
  - `ADMIN_PASS`: sua nova senha
  - `SESSION_SECRET`: chave secreta customizada (opcional)

### 1.4. Gerador Manual de Anúncios por Link (No Painel Replicador)
- **Acesso**: Aba **⚡ Gerador de Anúncios** no Cockpit do Replicador.
- **Como Usar**:
  1. Cole o link de afiliado ou produto do Mercado Livre (aceita `https://mercadolivre.com/sec/...`, `meli.la` ou link direto).
  2. *(Opcional)* Preencha o campo de **Cupom de Desconto** (ex: `APP10`) e os campos de preço (De / Por).
  3. Clique em **⚡ Puxar Dados & Gerar Anúncio**: o sistema extrai a foto 2X HD do Mercado Livre e monta a copy persuasiva para Pokémon TCG.
  4. Marque os grupos de destino desejados (ou use o botão "Marcar Todos os Destinos de Rotas").
  5. Clique em **🚀 Publicar no WhatsApp** para disparar a foto com a legenda com 1 clique!

---

## 2. Operação Diária do Bot Disparador na Nuvem

### 2.1. Conectando o Novo Chip no WhatsApp (Pelo Navegador)
1. Acesse o **Painel Online do Bot Disparador** pelo celular ou computador.
2. Na aba inicial, o painel exibirá o **QR Code** em tempo real gerado pelo Baileys.
3. No celular onde o novo chip está ativado:
   - Abra o WhatsApp ➔ **Aparelhos Conectados** ➔ **Conectar um aparelho**.
   - Aponte a câmera para o QR Code no navegador (ou utilize o código de pareamento de 8 dígitos).
4. O status mudará imediatamente para 🟢 **Conectado** e sincronizará os grupos do chip automaticamente.
5. O volume persistente (`/app/data`) do Railway garante que você **não seja desconectado** mesmo após novos deploys ou reinicializações do container.

### 2.2. Extração de Leads de Grupos Alvo
1. No painel online do disparador, vá para a aba **Grupos**.
2. Utilize a **barra de busca instantânea** para encontrar o grupo desejado (ex: grupos de Pokémon TCG, colecionadores, torneios).
3. Clique em **Extrair Membros**.
4. Todos os números de participantes serão salvos instantaneamente na base de dados com o grupo de origem.

### 2.3. Criação e Disparo de Campanhas
1. Vá na aba **Campanhas** ➔ clique em **Nova Campanha**.
2. Clique em um dos **Modelos Prontos Pokémon TCG** (ex: *Convite Grupo VIP Pokémon TCG*).
3. O **Simulador Oficial do WhatsApp Ao Vivo** ao lado exibirá exatamente como a mensagem chegará no WhatsApp do cliente, incluindo formatação, tags dinâmicas e horário.
4. Ajuste o texto ou Spintax se desejar.
5. Selecione o grupo ou lista de contatos e clique em **Criar e Iniciar Campanha**.
6. Acompanhe o progresso da fila em tempo real pelo painel online.

### 2.4. Atendimento Automático com IA (DeepSeek V4)
- Quando qualquer destinatário responder no privado, o motor de IA assumirá o atendimento automaticamente.
- A IA responde como um especialista amigável de Pokémon TCG, esclarece dúvidas, simula digitação humana (3 a 6 segundos) e direciona para o seu grupo VIP ou lista de ofertas.
- Todas as conversas ficam registradas na aba de histórico do painel.

---

## 3. Gestão de Atualizações e Deploy Contínuo (CI/CD)

- O Railway está conectado à branch `main` do GitHub: `https://github.com/cardoso-ix/promo-pokemon-tcg`.
- Sempre que uma alteração for enviada para o repositório (`git push origin main`), o Railway recompila e atualiza os contêineres automaticamente em menos de 2 minutos.
- Os volumes persistentes (`/app/data`) garantem que os bancos de dados (`replica.db` e `disparador.db`) e as sessões ativas do WhatsApp permaneçam intactos.

---

## 4. Operação Local (Opcional / Ambiente de Testes)

Caso queira realizar testes offline ou trabalhar em novas funcionalidades locais:

| Ação | Comando / Script | Acesso Local |
| --- | --- | --- |
| **Iniciar Replicador Local** | `iniciar.bat` (ou `cd app && npm start`) | `http://localhost:3000` |
| **Iniciar Disparador Local** | `iniciar-disparador.bat` (ou `cd bot-disparador && npm start`) | `http://localhost:3333` |
| **Parar Serviços Locais** | `parar.bat` | — |
