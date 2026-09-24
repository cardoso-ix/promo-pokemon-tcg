# Histórico de Decisões Técnicas — Promo Réplica

Este registro documenta a evolução arquitetural e as decisões estratégicas do projeto, prevenindo regressões e alinhando os princípios operacionais.

---

## Decisão 67 — Blindagem de Extração de Imagens e Eliminação de Banners Meli+
**Data:** 24/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**:
  1. **Sanitização de Tokens em og:image (`{sanitized_title}`)**:
     - O Mercado Livre insere o token `{sanitized_title}` no `og:image` de listas e vitrines (`/social/`). Em vez de descartar a imagem, o sistema agora limpa o token via `.replace(/\{sanitized_title\}/gi, '')`, recuperando a foto oficial do produto em resolução 2X HD (`679655-MLA...`).
  2. **Validador Estrito de Imagens de Produto (`isImagemValidaProdutoMl`)**:
     - Rejeição ativa de banners promocionais de campanha (sufixo `-OO.webp` / `-OO.jpg`), logos (`ui-navigation`, `180x180.png`), cabeçalhos e exibidores (`exhibitor`).
     - Validação obrigatória da tag de produto `_NP_` em URLs do `mlstatic.com`.
  3. **Segmentação Resiliente de Cards**:
     - Substituição do split frágil por `<div id="` para um regex lookahead por container de card (`poly-card` e `ui-search-layout__item`), impedindo que a página inteira seja tratada como um único card e evitando a captura acidental do banner do cabeçalho da página.
  4. **Proteção de Fallback no WhatsApp Client**:
     - O fallback de `linkPreviewThumbnail` foi desativado para mensagens com Mercado Livre (`!contemMercadoLivre`), pois o crawler da Meta costumava capturar o banner do Meli+ em vez do produto.
- **Motivo**: Prevenir que postagens nos grupos VIP sejam disparadas com banners horizontais de "Por apenas R$ 74,90/mês" ou propagandas de assinatura em vez da foto real do colecionável Pokémon TCG.

---

## Decisão 66 — Redesign Pokémon TCG "Ultra Ball & Rare Holo Foil" e Esteira Sentinela de Resiliência
**Data:** 15/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**:
  1. **Redesign Visual Pokémon TCG "Ultra Ball & Rare Holo Foil"**:
     - Paleta inspirada na Ultra Ball e na arena Pokémon TCG com Cosmic Dark (`#060810`), Ultra Gold (`#FFD700`) e Electric Cyan (`#00E5FF`).
     - Efeito holográfico de cartas raras (*Rare Holo Foil*) em CSS com reflexo dinâmico no hover dos cards e do feed.
     - Badges temáticos de tipos de Energia Pokémon (⚡ Elétrico, 💧 Água, 🌿 Planta, 🔥 Fogo e 🔮 Psíquico).
     - Medidor animado de **HP da Sessão** na quota anti-flood por hora, com transição dinâmica de cores (Verde -> Amarelo -> Vermelho crítico).
     - Balões de conversa no feed com visual autêntico do WhatsApp Dark (`#005c4b` e `#202c33`), tipografia nativa e confirmação de entrega dupla (`✓✓`).
  2. **Watchdog de Keepalive Baileys**:
     - Monitoramento ativo de integridade da conexão WebSocket a cada 45 segundos, com envio de heartbeat ping e detecção preventiva de conexões zumbis, garantindo auto-recuperação sem desemparelhar.
  3. **Sentinel do Cookie Mercado Livre (`meli.la`)**:
     - Verificação periódica automática da saúde da sessão do Mercado Livre a cada 45 minutos.
     - Notificação instantânea via WebSocket e banner contextual estilo *Pokémon Trainer Alert* na interface alertando o operador caso o cookie expire.
  4. **Esteira de Disparo Resiliente com Isolamento por Grupo**:
     - Tratamento isolado por destino com proteção contra buffers de imagem excessivos (>8MB) e validação estrita de JID, evitando que erros em um grupo interrompam o envio para os demais.
- **Motivo**: Elevar a experiência do usuário com identidade visual imersiva e marcante do universo Pokémon TCG, aliada à máxima estabilidade e tolerância a falhas na operação autônoma 24/7.

---

## Decisão 65 — Resiliência no Pareamento do WhatsApp, Assinatura Windows Chrome e Auto-Reset
**Data:** 15/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**:
  1. Auto-recuperação imediata no status `401 / loggedOut`: o robô apaga resíduos de chaves revogadas de `data/auth_baileys` e reinicia o Baileys automaticamente para emitir novo QR Code sem depender de reinicialização manual.
  2. Reconexão instantânea (0ms) no status `515 (restartRequired)` preservando as credenciais recebidas, viabilizando o handshake seguro pós-leitura de QR Code pelo celular.
  3. Adoção da assinatura oficial `Browsers.windows('Chrome')` (`['Windows', 'Chrome', '10.0.22631']`) e desativação de download completo de histórico inicial (`syncFullHistory: false`), atendendo ao protocolo atualizado da Meta e prevenindo estouro de memória no Railway.
  4. Disponibilização de endpoint `POST /api/whatsapp/reset` e botão de reset manual na aba de conexão do painel web.
- **Motivo**: Prevenir que desvinculações ou rotações de chaves travem o sistema em telas de loading infinito, assegurando que o pareamento do smartphone seja 100% confiável.

---

## Decisão 64 — Limpeza e Unificação Geral do Repositório
**Data:** 10/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**: Remoção de todos os artefatos, scripts legados (`.tmp-agente`, compose da Evolution API, dezenas de utilitários n8n descontinuados) e reescrita de 100% da documentação para focar exclusivamente na arquitetura moderna autônoma em Node.js/TypeScript.
- **Motivo**: Eliminar qualquer confusão entre a esteira legada e a nova solução definitiva.

---

## Decisão 63 — Hospedagem Nuvem 24/7 no Railway com Volume Persistente
**Data:** 10/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**: Implantar a réplica no Railway com volume persistente montado em `/app/data` e host configurado para `0.0.0.0`.
- **Motivo**: Permitir que a esteira funcione ininterruptamente sem exigir que o computador do operador fique ligado, preservando a autenticação do WhatsApp e o banco SQLite entre atualizações e deploys.

---

## Decisão 62 — Desembrulho Resiliente de Mídia e Fallback 2X
**Data:** 10/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**: Implementar decodificação profunda de payloads de mensagens do Baileys para extrair fotos encapsuladas em `ephemeralMessage`, `viewOnceMessageV2` e `deviceSentMessage`. Caso o post seja apenas texto mas contenha link do ML, busca a foto oficial do produto em resolução 2X.
- **Motivo**: Garantir que toda oferta seja entregue com sua respectiva foto em alta definição nos grupos de destino.

---

## Decisão 61 — Preservação de Quebras de Linha e Formatação Humana
**Data:** 10/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**: Ajustar o filtro `cleanSpamLines` para remover apenas assinaturas de concorrentes (`@rasgabooster`, etc.) e links de convite, preservando intactos todos os blocos de texto, quebras de parágrafo (`\n\n`) e espaçamentos originais.
- **Motivo**: As mensagens replicadas precisam manter legibilidade agradável e visual humano, sem blocos de texto aglutinados.

---

## Decisão 60 — Encurtamento Oficial `meli.la` com Cookie de Afiliado
**Data:** 10/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**: Integração direta com a API de Afiliados do Mercado Livre via cookie de sessão para geração de links curtos `https://meli.la/xxxxxx`.
- **Motivo**: Links `meli.la` apresentam a maior taxa de conversão no mobile, abrem diretamente o aplicativo do Mercado Livre e garantem comissionamento confiável.

---

## Decisão 59 — Aposentadoria de n8n, Evolution API e Postgres Externo
**Data:** 10/09/2026 · **Decisor:** Eduardo / Antigravity

- **A decisão**: Substituição de toda a infraestrutura fragmentada (n8n, VPS Hostinger, Evolution API, Postgres 16) por uma aplicação única, leve e autônoma em Node.js 22 LTS, TypeScript, Baileys e SQLite embarcado (`better-sqlite3`).
- **Motivo**: Zero custo de infraestrutura intermediária, inicialização em milissegundos, consumo de RAM reduzido (menos de 200MB) e eliminação de falhas de comunicação entre múltiplos containers.

---

## Decisão 58 — Cópia Idêntica com Troca Focada de Afiliado
**Data:** 01/09/2026 · **Decisor:** Eduardo

- **A decisão**: A réplica copia fielmente a estrutura da postagem de origem, alterando apenas os links de destino para os links de afiliado do operador. Sem cards pesados ou reformatações artificiais.
