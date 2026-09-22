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

### 2.3. Exclusividade Mercado Livre e Bloqueio de Concorrentes
- A esteira protege seus grupos contra vazamento de tráfego para outros marketplaces:
  - Links de marketplaces concorrentes (Amazon, Shopee, Magalu, AliExpress) são **automaticamente ignorados** pelo filtro (`status: 'ignorado'`, `motivo: 'marketplace_concorrente'`).
  - Links de convite para grupos de WhatsApp de concorrentes (`chat.whatsapp.com`) são **automaticamente removidos** de todas as mensagens replicadas.

### 2.4. Telas de Cupom e Digitações Avulsas (Comunicados)
- **Telas de Cupom (Prints de Cupons)**:
  - Se um grupo monitorado postar um print do app ou texto anunciando cupom (mesmo sem link no original), o sistema aceita o alerta e anexa automaticamente o **link curto oficial da sua vitrine do Mercado Livre** (`link_vitrine_curto`, ex: `https://mercadolivre.com/sec/2rM6RPm`).
  - O Guardião de Nicho TCG aceita cupons automaticamente, pois são de interesse direto de todos os colecionadores.
- **Digitações Avulsas e Comunicados**:
  - Mensagens informativas de texto puro ou fotos sem link de compra (ex: comunicados de envios da Copag, regras do grupo ou avisos do admin) podem ser replicadas diretamente caso a opção *"Replicar Comunicados & Telas de Cupom (Sem Link)"* esteja ativada (`replicar_comunicados_texto: 'true'`).
  - Assinaturas e @arrobas de concorrentes continuam sendo limpos automaticamente antes do envio.

---

## 3. Suíte de Réplica Pro (Opção C)

### 3.1. Guardião de Nicho TCG (Filtro Inteligente de Card Games)
- A esteira analisa o título, texto e slug do produto contra uma lista inteligente de termos do ecossistema TCG.
- **Categorias e Franquias Aceitas**: Pokémon TCG, Magic: The Gathering (MTG), Yu-Gi-Oh!, One Piece Card Game, Lorcana, Digimon, Dragon Ball Super Card Game, Copag, Konami, Wizards of the Coast, Bandai.
- **Produtos Aceitos**: Booster, Booster Box, ETB (Treinador Avançado), Blister, Tripack, Fichário, Sleeves/Shields, Decks, Playmat, Latas Colecionáveis e Cartas Avulsas.
- **Produtos Rejeitados**: Itens fora do nicho postados por concorrentes (como panelas, eletrônicos, vestuário geral ou cosméticos) são ignorados automaticamente (`status: 'ignorado'`, `motivo: 'fora_nicho_tcg'`).

### 3.2. Desduplicação Global Cross-Group por ID Canônico (MLB ID + 5 min Cooldown)
- Permite monitorar **dezenas de grupos simultâneos** sem reenviar a mesma oferta repetida aos membros.
- Quando o primeiro grupo posta um produto MLB, o sistema armazena seu ID único na tabela `produtos_replicados`.
- Se outros grupos postarem o mesmo produto dentro da janela configurada (padrão: 5 minutos), as réplicas subsequentes são bloqueadas com `motivo: 'duplicata_produto_cooldown'`.
- **Exceção de Queda de Preço**: Caso um grupo posterior poste o mesmo produto com um desconto ainda maior (> 5% de queda), o bot quebra o cooldown e republica destacando o novo menor preço.

### 3.3. Templates Padronizados de Marca
Em vez de herdar o estilo e formatação dos concorrentes, o bot classifica a mensagem e formata no layout oficial da sua marca com a assinatura `@pokemon_tcg_promo` no início:
1. **Template 1: Oferta Regular TCG**: Inicia com `@pokemon_tcg_promo`, título destacado em negrito, De/Por, cálculo automático de `% OFF` e valor economizado em reais, cupom (se houver) e link direto `meli.la`.
2. **Template 2: Alerta de Urgência & Escassez**: Disparado automaticamente ao identificar termos como *"últimas unidades"*, *"corre"*, *"vai acabar"* ou *"estoque acabando"*, com assinatura `@pokemon_tcg_promo` e destaque visual forte de oferta relâmpago.
3. **Template 3: Cupons de Desconto & Vitrine Oficial**: Identifica códigos promocionais do Mercado Livre com a assinatura `@pokemon_tcg_promo` e direciona os clientes para a sua lista/vitrine oficial (`link_vitrine_curto`).

### 3.4. Fila com Cadência Elegante (Pacing Anti-Spam)
- Intervalo mínimo de 8 a 10 segundos entre envios sucessivos ao mesmo destino.
- Evita rajadas de mensagens no WhatsApp caso múltiplos grupos concorrentes postem simultaneamente.

---

## 4. Manipulação de Mídia e Imagens

1. **Fotos Nativas do WhatsApp**:
   - Mensagens com imagem anexada têm seus buffers de áudio/foto extraídos diretamente pelo Baileys.
   - Suporte nativo a desempacotamento de mensagens temporárias (*ephemeral*), fotos de visualização única (*viewOnce*) e mensagens postadas pelo próprio aparelho conectado (`deviceSentMessage`).
2. **Fallback de Scraper em Alta Definição (2X)**:
   - Se a postagem original for apenas texto, mas contiver um link de produto do Mercado Livre, o sistema faz uma requisição leve para coletar a imagem oficial do produto (`og:image`) em alta resolução (`2X`).
   - A imagem é baixada em memória e enviada junto com o texto como legenda (*caption*), garantindo que o grupo de destino sempre receba uma postagem visualmente atraente.
