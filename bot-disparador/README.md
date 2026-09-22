# ⚡ Bot Disparador & Atendimento IA — Pokémon TCG (DeepSeek V4)

Sistema profissional e completo para **Extração de Leads de Grupos**, **Disparos em Massa Anti-Ban com Spintax** e **Atendimento Humanizado no Privado com Inteligência Artificial (DeepSeek V4 via OpenCode)**, desenvolvido sob medida para o ecossistema de **Pokémon TCG** com estética refinada Google Cloud / Gemini Dark.

---

## 🎯 Visão Geral da Plataforma

A aplicação roda de forma independente na porta **`3333`** (`http://localhost:3333`) e é composta por 6 grandes módulos integrados:

1. **Conexão WhatsApp Multi-Aparelhos (Baileys):**
   - Suporte a leitura de **QR Code** ou conexão por **Código de Pareamento de 8 dígitos** (sem precisar de câmera).
   - Reconexão automática com recuperação de sessão persistida em `data/auth_baileys/`.

2. **Captação & Extração Automática de Grupos:**
   - Sincroniza todos os grupos do chip conectado com 1 clique.
   - Barra de busca instantânea com filtro em tempo real e contador de grupos.
   - Extrai instantaneamente os números e nomes de todos os participantes de qualquer grupo com 1 clique, salvando-os na base de leads.

3. **Base de Leads e Destinatários:**
   - Visualização de contatos com grupo de origem, tipo de captação e data.
   - Busca em tempo real por nome, número ou grupo.
   - Importador manual em lote (aceita qualquer formato com ou sem DDD, com ou sem pontuação).

4. **Disparador em Massa com Proteção Anti-Ban:**
   - Motor de filas com controle inteligente de envio.
   - **Simulador Oficial do WhatsApp Ao Vivo (Mockup Lateral):** preview interativo lado a lado que reflete em tempo real o balão verde do WhatsApp, suporte a imagens anexadas, formatação de texto (`*negrito*`, `_itálico_`), horário e duplo tique azul `✓✓`.
   - **Modelos Prontos Pokémon TCG:** 4 templates de alta conversão prontos para 1 clique (Convite VIP, Desconto em Booster Boxes, Fichários/Sleeves e Aquecimento Amigável).
   - **Spintax Anti-Ban `{Opção 1|Opção 2|Opção 3}`:** cada contato da fila recebe uma variação de mensagem única e randômica.
   - **Tags Dinâmicas:** `{nome}`, `{saudacao}`, `{grupo}`, `{numero}`.
   - **Lixeira de Campanhas:** exclusão de campanhas com limpeza em cascata da fila.

5. **Meta Shield — Auditor de Diretrizes Anti-Ban em Tempo Real:**
   - **Score de Risco Anti-Ban (0 a 100):** Classificação dinâmica em 🟢 **Seguro (80-100)**, 🟡 **Moderado (60-79)** e 🔴 **Alto Risco (< 60)**.
   - **Auditoria Heurística Automática:** Detecção instantânea de palavras de spam (*"compre já"*, *"urgente"*, *"renda extra"*), links diretos em mensagens frias, ausência de personalização (`{nome}`), CAIXA ALTA excessiva e falta de tom conversacional.
   - **Contador Combinatório de Spintax:** Calcula em tempo real quantas variações únicas o Spintax produzirá para a fila de envio.
   - **Otimizador Inteligente com IA (DeepSeek):** Botão com 1 clique para reescrever e blindar qualquer template automaticamente segundo as regras da Meta.
   - **Trava de Segurança:** Alerta e bloqueia disparos acidentais com templates de alto risco sem confirmação do operador.

6. **Atendimento Inteligente com IA (DeepSeek V4 via OpenCode):**
   - Responde clientes no privado imitando um especialista amigável de Pokémon TCG.
   - Simulação realista de digitação (*delay humanizado* de 3 a 6 segundos).
   - Integração com o gateway OpenCode (`https://opencode.ai/zen/go/v1`) com modelos `deepseek-v4-pro` e `deepseek-v4-flash`.
   - Sandbox interativa para testar respostas da IA diretamente no navegador.

7. **Painel de Parâmetros Anti-Ban & Aquecimento de Chip:**
   - Intervalos mínimo e máximo entre mensagens (ex: 30s a 65s).
   - Pausa obrigatória de descanso a cada N mensagens (ex: 5 min a cada 20 envios).
   - Horário de operação (início e fim dos disparos).
   - Limite diário de envios (cota segura para chips recém-adquiridos).

---

## ☁️ Operação em Produção (Nuvem 24/7)

O **Bot Disparador & Atendimento IA** opera **100% online no Railway** dentro do contêiner Docker oficial com volume persistente montado em `/app/data`:
- **Acesso:** Abra a URL HTTPS pública gerada pelo Railway no seu computador, tablet ou celular.
- **Conexão WhatsApp:** Escaneie o QR Code diretamente pelo navegador. As chaves criptográficas ficam salvas no volume persistente, garantindo conexão permanente mesmo em novos deploys.
- **Zero Dependência Local:** Não precisa manter seu computador ligado.

---

## 💻 Ambiente Local de Desenvolvimento (Opcional)

Caso queira testar novas funções localmente:

### Opção 1: Script Automático (Windows)
```text
iniciar-disparador.bat
```

### Opção 2: Terminal
```bash
cd bot-disparador
npm install
npm run build
npm start
```
Após iniciar, abra: 👉 `http://localhost:3333`

---

## 📝 Modelos Prontos Inclusos (Templates de Alta Conversão)

No modal de criação de campanhas, basta clicar em qualquer um dos cards para preencher automaticamente:

1. **Convite Grupo VIP Pokémon TCG:**
   > *"{Olá|Fala|Oi} {nome}! {Tudo bem com você|Como estão as coisas}? Vi seu contato no grupo {grupo}! 🎴⚡ Criei um grupo VIP exclusivo onde solto diariamente promoções com até 50% OFF em Boosters, Boxes, Decks e Fichários! (...)"*

2. **Oferta Relâmpago Boxes & Copag:**
   > *"{Fala|Oi|E aí} {nome}! Passando rápido para te avisar que liberaram uma promoção relâmpago de Pokémon TCG hoje com estoque limitado! 🔥 Tem Booster Box e ETBs abaixo da Copag! Dá uma olhada: https://mercadolivre.com/sec/2rM6RPm"*

3. **Acessórios (Fichários & Sleeves):**
   > *"{Olá|Oi} {nome}! Se você estiver precisando organizar sua coleção, liberaram cupons em Fichários 360 cartas e Sleeves a partir de R$ 35 com frete Full (...)"*

4. **Aquecimento / Anti-Ban:**
   > *"{Olá|Oi|Fala} {nome}! Encontrei seu contato através do grupo {grupo}. Você ainda está na ativa jogando ou colecionando Pokémon TCG ultimamente? (...)"*

---

## 🛡️ Guia de Aquecimento de Chip Novo (Para o Primeiro Dia)

Quando conectar um chip virgem ou recém-adquirido:

1. **Complete o Perfil no WhatsApp:**
   - Foto de perfil nítida e amigável.
   - Nome e recado preenchidos no WhatsApp.
2. **Histórico Inicial (24h - 48h):**
   - Converse com 2 a 3 amigos ou números conhecidos.
   - Entre em 1 grupo e participe de algumas conversas antes de iniciar disparos maciços.
3. **Parâmetros Seguros para o Início:**
   - **Delay entre mensagens:** 35s a 70s.
   - **Pausa de descanso:** 5 minutos a cada 15 a 20 mensagens.
   - **Limite diário inicial:** Máximo de 30 a 50 mensagens no primeiro dia, subindo gradualmente nos dias seguintes.

---

## 🧪 Testes Automatizados

O projeto conta com suíte de testes unitários para o motor Spintax, substituição de variáveis e operações de banco de dados:

```bash
cd bot-disparador
npm test
```
