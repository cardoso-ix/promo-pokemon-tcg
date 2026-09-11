# Visão de Produto — Promo Réplica Pokémon TCG

## Plataforma

Web (Fastify + WebSockets + HTML5/CSS3/JS Vanilla responsivo para desktop, tablet e smartphone).

## Usuários e Perfil

Operador de promoções de Pokémon TCG que necessita de uma esteira de replicação 100% autônoma, confiável e permanente (24/7 na nuvem), acessível de qualquer dispositivo (computador ou celular), sem precisar manter sua máquina local ligada.

## Propósito do Produto

Monitorar grupos de WhatsApp de ofertas de Pokémon TCG, interceptar postagens de promoções, substituir automaticamente links de terceiros por links oficiais de afiliado do Mercado Livre com encurtamento `meli.la`, replicar mídias originais com alta resolução e republicar instantaneamente nos grupos de destino designados.

## Posicionamento

Não é um SaaS público multitenant nem uma ferramenta de disparo em massa (spam). É um cockpit privado, ágil e autônomo construído sob medida para replicação profissional de ofertas de colecionáveis Pokémon TCG no ecossistema WhatsApp e Mercado Livre Afiliados.

## Arquitetura & Stack Tecnológica

- **Backend**: Node.js 22 LTS + TypeScript (compilado nativamente).
- **Conector WhatsApp**: `@whiskeysockets/baileys` nativo (sem intermediários externos como Evolution API ou n8n).
- **Servidor Web & API**: Fastify 5 com `@fastify/websocket` para streaming de eventos em tempo real.
- **Banco de Dados**: SQLite embarcado (`better-sqlite3`) armazenado em `/app/data/replica.db`.
- **Hospedagem & Nuvem**: Railway / Render com montagem de volume persistente em `/app/data` para preservar credenciais do WhatsApp e configurações.
- **Frontend**: Dashboard Dark Theme de alta performance sem frameworks pesados, com feedback instantâneo via WebSocket.

## Capacidades Principais

1. **Gestão Visual de Rotas**:
   - Criação e edição de rotas relacionando múltiplos grupos de origem a múltiplos grupos de destino.
   - Sincronização e exibição dos grupos pelo **nome legível**, nunca por IDs brutos (`@g.us`).
   - Chave liga/desliga geral da esteira e chaves individuais por rota.

2. **Conversão de Afiliados Mercado Livre**:
   - Encurtador oficial `meli.la` autenticado por cookie de sessão.
   - Fallback resiliente para link com parâmetros diretos (`matt_word` e `matt_tool`).
   - Remoção de assinaturas concorrentes preservando formatação e quebras de linha.

3. **Replicação Fiel de Mídia**:
   - Decodificação de mídias regulares, temporárias (*ephemeral*), de visualização única (*viewOnce*) e enviadas de aparelhos conectados (`deviceSentMessage`).
   - Fallback para scraping de imagem oficial do produto em resolução 2X quando a postagem original contiver apenas texto com link.

4. **Operação e Monitoramento**:
   - Cockpit com métricas de postagens na última hora e total diário.
   - Feed de atividades em tempo real via WebSocket.
   - Teste instantâneo de conexão com a API de Afiliados do Mercado Livre diretamente no painel.
