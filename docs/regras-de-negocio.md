# Regras de Negócio — Promo Réplica

Documento que define o comportamento exato da esteira de replicação autônoma.

---

## 1. Fluxo de Decisão e Triagem

Toda mensagem que chega aos grupos de WhatsApp em que o chip participa é avaliada pelas seguintes regras, na ordem:

| # | Regra | Ação / Comportamento |
| --- | --- | --- |
| **1** | **Apenas Grupos** | Mensagens privadas (DMs) são descartadas imediatamente. Apenas JIDs `@g.us` são processados. |
| **2** | **Proteção Anti-Loop** | Se a mensagem for postada pelo próprio chip em um grupo configurado como **Destino**, ela é ignorada para evitar loops infinitos. |
| **3** | **Validação de Rota** | O grupo de origem precisa pertencer a pelo menos uma **Rota Ativa** no banco SQLite. |
| **4** | **Esteira Ligada** | O parâmetro global `ativo` deve estar configurado como `true`. Caso contrário, a mensagem é ignorada. |
| **5** | **Janela de Atraso Máximo** | Mensagens com timestamp de envio superior a `atraso_maximo_segundos` (padrão: 600s / 10 minutos) são descartadas como defasadas. |
| **6** | **Teto Anti-Flood por Hora** | Se o número de postagens enviadas na última hora atingir `teto_hora` (padrão: 40), novos posts são ignorados para proteger os grupos contra saturação e bloqueios do WhatsApp. |
| **7** | **Desduplicação de Conteúdo** | Um hash único (SHA-256) é gerado combinando o texto e a mídia da mensagem. Se o hash já existir na tabela `logs`, a mensagem é ignorada sem duplicação. |

---

## 2. Tratamento e Conversão de Links de Afiliado

### 2.1. Encurtamento Oficial `meli.la` (Prioridade 1)
- Sempre que houver um cookie de sessão válido configurado no painel (`meli_cookie`), o sistema envia a URL original para a API oficial de afiliados do Mercado Livre.
- A API retorna um link encurtado oficial no formato:
  ```text
  https://meli.la/xxxxxx
  ```
- Este link garante a maior taxa de conversão, reconhecimento oficial no aplicativo mobile do Mercado Livre e atribuição segura de comissão.

### 2.2. Fallback Parametrizado Direto (Prioridade 2)
- Caso o cookie esteja ausente, expirado ou a API do Mercado Livre esteja temporariamente indisponível, o sistema aplica automaticamente os parâmetros de afiliado:
  ```text
  {url_produto}?matt_word={affiliate_matt_word}&matt_tool={affiliate_matt_tool}&forceInApp=true
  ```

### 2.3. Outros Marketplaces
- Links de outras lojas (Amazon, Shopee, Magalu, etc.) não são removidos nem descartados; são preservados na íntegra.

---

## 3. Limpeza de Texto e Preservação de Formatação

O algoritmo de higienização de texto (`cleanSpamLines`) atua com precisão cirúrgica:

1. **Preservação de Parágrafos**: Quebras de linha normais entre o título do produto, preço e detalhes (`\n\n`) são preservadas, mantendo o aspecto humano e agradável do post original.
2. **Remoção de Concorrentes**: Linhas ou menções configuradas em `frases_remover` (como `@rasgabooster.tcg`, `#rasgaboot`, links de convite de grupos de terceiros) são eliminadas.
3. **Preço sem Cashtags**: Garante que menções monetárias como `R$ 150,00` não sejam transformadas em cashtags verdes indesejadas pelo aplicativo do WhatsApp.

---

## 4. Manipulação de Mídia e Imagens

1. **Fotos Nativas do WhatsApp**:
   - Mensagens com imagem anexada têm seus buffers de áudio/foto extraídos diretamente pelo Baileys.
   - Suporte nativo a desempacotamento de mensagens temporárias (*ephemeral*), fotos de visualização única (*viewOnce*) e mensagens postadas pelo próprio aparelho conectado (`deviceSentMessage`).
2. **Fallback de Scraper em Alta Definição (2X)**:
   - Se a postagem original for apenas texto, mas contiver um link de produto do Mercado Livre, o sistema faz uma requisição leve para coletar a imagem oficial do produto (`og:image`) em alta resolução (`2X`).
   - A imagem é baixada em memória e enviada junto com o texto como legenda (*caption*), garantindo que o grupo de destino sempre receba uma postagem visualmente atraente.
