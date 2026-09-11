# Histórico de Decisões Técnicas — Promo Réplica

Este registro documenta a evolução arquitetural e as decisões estratégicas do projeto, prevenindo regressões e alinhando os princípios operacionais.

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
