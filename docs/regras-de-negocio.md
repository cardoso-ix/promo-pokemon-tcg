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
- **Pokémons e Coleções Reconhecidos**: Pokémons de alto valor comercial e colecionável (*Greninja, Sylveon, Umbreon, Espeon, Vaporeon, Jolteon, Flareon, Glaceon, Leafeon, Rayquaza, Lugia, Ho-Oh, Mew, Mewtwo, Gengar, Lucario, Charizard, Pikachu, Blastoise, Venusaur, Tyranitar, Dragonite, Arceus, Meowscarada, Miraidon, Koraidon, Ogerpon, Terapagos*), além de coleções (*30 Anos, 25 Anos, Celebrações, Evoluções Prismáticas, Destinos Brilhantes, Fogo Fantasmagórico, Heróis Excelsos, 151, Força Temporal*).
- **Produtos Aceitos**: Booster, Booster Box, ETB (Treinador Avançado), Blister, Tripack, Quadpack, Fichário, Sleeves/Shields, Decks, Playmat, Latas Colecionáveis e Cartas Avulsas.
- **Produtos Rejeitados**: Itens fora do nicho postados por concorrentes (como panelas, eletrônicos, vestuário geral ou cosméticos) são ignorados automaticamente (`status: 'ignorado'`, `motivo: 'fora_nicho_tcg'`).

### 3.2. Desduplicação Global Cross-Group por ID Canônico (MLB ID ou Hash de Cupom + 30 min Cooldown)
- Permite monitorar **dezenas de grupos simultâneos** sem reenviar a mesma oferta repetida aos membros.
- Quando o primeiro grupo posta um produto MLB ou uma lista de cupons, o sistema armazena seu identificador único na tabela `produtos_replicados`.
- Se outros grupos postarem o mesmo produto ou a mesma lista de cupons dentro da janela configurada (padrão: 30 minutos), as réplicas subsequentes da mesma oferta são bloqueadas com `motivo: 'duplicata_produto_cooldown'`.
- **Exceção de Queda de Preço**: Caso um grupo posterior poste o mesmo produto com um desconto ainda maior (> 5% de queda), o bot quebra o cooldown e republica destacando o novo menor preço.

### 3.3. Templates Padronizados de Marca
Em vez de herdar o estilo e formatação dos concorrentes, o bot classifica a mensagem e formata no layout oficial da sua marca com a assinatura `@pokemon_tcg_promo` no início:
1. **Template 1: Oferta Regular TCG**: Inicia com `@pokemon_tcg_promo`, título destacado em negrito, De/Por, cálculo automático de `% OFF` e valor economizado em reais, condição de parcelamento sem juros condicional (`💳 Em até X sem juros` extraído automaticamente quando presente na mensagem original), cupom (se houver) e link direto no carrinho (`🛒 <link>`).
2. **Template 2: Alerta de Urgência & Escassez**: Disparado automaticamente ao identificar termos como *"últimas unidades"*, *"corre"*, *"vai acabar"* ou *"estoque acabando"*, com assinatura `@pokemon_tcg_promo`, destaque de urgência, De/Por, parcelamento condicional (`💳 Em até X sem juros`), cupom e link direto (`🛒 <link>`).
3. **Template 3: Cupons de Desconto & Listas Promocionais**: Replica fielmente o que for fornecido no anúncio de cupom (incluindo listas com múltiplos cupons e regras de compra mínima), higienizando e convertendo links para o afiliado oficial e assinando `@pokemon_tcg_promo` no topo.

### 3.4. Mensagens Avulsas & Comunicados Desativados por Padrão
- Mensagens de texto livre sem link de produto ou cupom são bloqueadas por padrão (`replicar_comunicados_texto: false`).
- Evita que conversas, saudações ou mensagens avulsas de um grupo concorrente sejam replicadas ou cruzem com outros grupos monitorados.

### 3.5. Fila com Cadência Elegante (Pacing Anti-Spam)
- Intervalo mínimo de 8 a 10 segundos entre envios sucessivos ao mesmo destino.
- Evita rajadas de mensagens no WhatsApp caso múltiplos grupos concorrentes postem simultaneamente.

### 3.6. Extração Robusta de Preços e Prevenção de Truncamento
- **Barreira Anti-Backtracking `(?!\d)`:** Expressões regulares blindadas contra truncamento de dígitos na leitura de preços (ex: impede que `R$ 88` seja capturado como `R$ 8` ou `R$ 120` como `R$ 12` quando acompanhados de termos como `no pix`, `reais`, `à vista`, `cada`, etc.).
- **Filtro Estrito de Não-Preços:** Rejeita explicitamente porcentagens de desconto (`15%`, `20% OFF`) e contadores de parcelamento (`10x`, `12x`) como valores monetários, evitando capturas inválidas como `R$ 1`.
- **Desambiguação de Parcelas:** Em mensagens com ofertas mistas (ex: `R$ 88 ou em até 10x de R$ 8,80`), a parcela é isolada e direcionada exclusivamente para a linha de parcelamento, garantindo que o preço principal publicado seja sempre o valor à vista (`R$ 88`).
- **Suporte a Múltiplos Formatos Monetários:** Normalização transparente para inteiros (`88`), moeda com vírgula (`88,00`), separadores de milhar (`1.240,00`) e notação decimal com ponto (`88.00`).

---

## 4. Manipulação de Mídia e Imagens (Arquitetura em 4 Camadas de Resiliência)

1. **Fotos Nativas do WhatsApp**:
   - Mensagens com imagem anexada têm seus buffers de áudio/foto extraídos diretamente pelo Baileys.
   - Suporte nativo a desempacotamento de mensagens temporárias (*ephemeral*), fotos de visualização única (*viewOnce*) e mensagens postadas pelo próprio aparelho conectado (`deviceSentMessage`).
2. **Parser Resiliente de Vitrines e Listas Sociais do Mercado Livre**:
   - Para links encurtados de vitrines e listas de concorrentes (`/social/.../lists`), o parser delimita os cards inteiros por containers (`andes-card`, `poly-card--grid-card`), preservando a portada da imagem e o link do produto juntos.
   - Extrai a imagem oficial do produto do card e a normaliza automaticamente para alta definição (`2X`) e formato JPG.
3. **Diferenciação Inteligente de Cupons vs Ofertas com Cupom**:
   - Mensagens de **comunicados puros de novos cupons** (sem produto específico, sem preço De/Por) que chegam originalmente apenas em digitação no concorrente continuam sendo postadas como texto puro / sem fotos aleatórias da vitrine.
   - **Ofertas reais de produtos específicos que aceitam cupom** (ex: Blister Triplo com cupom) agora são identificadas como produtos legítimos e buscam a foto oficial no anúncio normalmente.
4. **Fallback em Cascata (WhatsApp Fallback & Link Preview)**:
   - Se a mensagem original tinha foto mas o download do WhatsApp falhou (por oscilação de rede ou mídia expirada na Meta), a esteira aciona automaticamente a busca da foto oficial pelo link do anúncio.
   - Se o download da foto oficial em alta resolução sofrer bloqueio de WAF (`suspicious-traffic-frontend`), o sistema utiliza como plano de contingência a miniatura de pré-visualização (`linkPreviewThumbnail`) gerada pelo próprio WhatsApp.

---

## 5. Mensagem Diária Automática de Abertura do Grupo (07:00 AM)

O sistema conta com um agendador autônomo e de alta precisão para engajar e dar as boas-vindas aos membros da comunidade todas as manhãs:

1. **Horário de Brasília (`America/Sao_Paulo`)**:
   - Disparado pontualmente no horário configurado (padrão: `07:00` da manhã), independente de o servidor em nuvem operar em UTC.
2. **Conteúdo 100% Humanizado & Curadoria a Dedo**:
   - **Zero menção a robôs ou automações frias**: a comunicação transmite calor humano, proximidade e dedicação diária de fã para fã.
   - Reforça o tempo diário dedicado pelo criador/administrador para garimpar estoques reais, verificar cupons válidos e evitar pegadinhas ou preços abusivos.
   - Agradece de coração a cada um dos membros pela presença e apoio mútuo.
   - Convida abertamente a adicionar amigos colecionadores e compartilhar o grupo para expandir a comunidade de forma orgânica.
   - Assinatura oficial `@pokemon_tcg_promo` e tag dinâmica `{dia_semana}` (ex: sexta-feira).
3. **Persistência Anti-Duplicidade no SQLite**:
   - A data do envio é persistida em banco (`msg_abertura_ultimo_envio`). Mesmo que o container reinicie ou o WhatsApp reconecte às 07:02, a mensagem nunca é enviada duas vezes no mesmo dia.
4. **Pacing Seguro Multi-Grupo**:
   - A mensagem é enviada automaticamente para todos os grupos de destino configurados nas rotas ativas (`rota_destinos`), com cadência humanizada de 3 segundos entre cada grupo para evitar qualquer risco à conexão do WhatsApp.
5. **Seletor de Flags Visuais e Simulador WhatsApp no Cockpit**:
   - O operador conta com cards/flags visuais de 1 clique no painel para alternar entre os modelos ou ativar o modo rotativo:
     - 🔄 **Alternância Automática (`[ROTACAO_DIARIA]`)**: Revezamento dinâmico — a cada dia da semana o grupo acorda com uma mensagem diferente e humanizada.
     - 🌟 **Modelo 1 (Comunidade & Curadoria a Dedo)**: Foco em gratidão, acolhimento e dedicação pessoal às buscas.
     - 🎯 **Modelo 2 (Garimpo Diário & Ofertas Reais)**: Foco em caçar promoções verdadeiras, alertando contra fakes e ágio.
     - 🃏 **Modelo 3 (Colecionador Raiz & Preço Justo)**: Linguagem técnica e próxima de colecionador experiente.
     - 🎟️ **Modelo 4 (Cupons & Achados Selecionados)**: Foco em estratégia de compra, cupons acumulados e frete grátis.
   - **Simulador Visual do WhatsApp**: balão com pré-visualização ao vivo renderizando a data do dia em tempo real.
   - **Salvar com 1 Clique**: botão direto no card para persistir instantaneamente sem precisar rolar a página.
   - **Disparo de Teste**: botão **"🚀 Testar Envio Agora no WhatsApp"** para homologação em tempo real.

---

## 6. Motor Canônico TCG Inteligente & Deduplicação de Produtos

### 6.1. O Problema das Variações de Títulos de Vendedores
Em grupos de WhatsApp e no Mercado Livre, um mesmo produto recebe dezenas de títulos diferentes por conta de cada vendedor:
- Vendedor A: *"📦 🇧🇷 Box Display ME05 Escuridão Absoluta Copag"*
- Vendedor B: *"Box Booster Display Escuridao Absoluta Oficial Lacrada"*
- Vendedor C: *"Display Pokémon Escuridao Absoluta 36 Boosters"*

Sem canonicalização, o sistema gerava 3 linhas separadas na tabela, dividindo as postagens e impossibilitando calcular com precisão o verdadeiro menor e maior preço daquele item.

### 6.2. Arquitetura do Motor Canônico (`extrairIdentidadeCanonicaTCG`)
O motor canônico analisa o título em duas dimensões determinísticas:

#### A. Identificação do Formato TCG (Prioridade Decrescente):
1. `blister_triplo`: Blister Triplo / 3 Boosters / Tripack.
2. `blister_quad`: Blister Quádruplo / Quadpack / 4 Boosters.
3. `booster_box`: Booster Box / Display 36 / Box Booster / Caixa Display.
4. `etb`: Elite Trainer Box / ETB / Caixa de Treinador Avançado.
5. `bundle_poster`: Coleção Pôster / Poster Collection.
6. `colecao_especial`: Coleção Especial / Coleção Ilustração Especial / UPC / Caixa Premium.
7. `blister_unitario`: Blister Unitário / Booster Avulso / 1 Booster.
8. `lata`: Lata Colecionável / Tin / Mini Tin.
9. `fichario`: Fichário / Álbum / Pasta de Cartas.
10. `deck`: Deck de Batalha / Battle Deck / Baralho.
11. `bundle`: Booster Bundle / Combo Especial.
12. `acessorio_sleeves`: Sleeves Protetores / Shields.
13. `acessorio_toploader`: Toploaders Protetores.

#### B. Identificação da Coleção / Expansão Oficial:
- `escuridao_absoluta`: Escuridão Absoluta / ME05 / Darkness Ablaze.
- `evolucoes_prismaticas`: Evoluções Prismáticas / SV8.5 / Prismatic Evolutions.
- `faiscas_volumosas`: Faíscas Volumosas / SV08 / Surging Sparks.
- `coroa_estelar`: Coroa Estelar / SV07 / Stellar Crown.
- `mascaras_do_crepusculo`: Máscaras do Crepúsculo / SV06 / Twilight Masquerade.
- `forca_temporal`: Força Temporal / SV05 / Temporal Forces.
- `destinos_de_paldea`: Destinos de Paldea / SV04.5 / Paldean Fates.
- `fenda_paradoxal`: Fenda Paradoxal / SV04 / Paradox Rift.
- `151`: Pokémon 151 / SV03.5.
- `chamas_obsidianas`: Chamas Obsidianas / SV03 / Obsidian Flames.
- `evolucoes_em_paldea`: Evoluções em Paldea / SV02 / Paldea Evolved.
- `escarlate_e_violeta_base`: Escarlate e Violeta Base / SV01.
- `30_anos`: Coleção 30 Anos.
- `celebracoes_25`: Celebrações 25 Anos.
- E coleções clássicas SWSH (Cênit dos Coroados, Tempestade Prateada, Origem Perdida, Astros Reluzentes, Golpe Fusão, Céus em Evolução, etc.).

### 6.3. Composição da Chave Canônica & Regra de Isolamento
1. **Regra de Ouro (Isolamento de Formato):** Uma *Booster Box (Display 36)* **nunca** se mistura com um *Blister Triplo* ou *ETB*, pois representam tickets de preço totalmente distintos (~R$ 300 vs ~R$ 40 vs ~R$ 350).
2. **Chave Determinística:** Se formato e coleção forem detectados:
   `chave_canonica = ${formatoId}__${colecaoId}`
   Exemplo: `booster_box__escuridao_absoluta`, `blister_triplo__escuridao_absoluta`.
3. **Nome Padronizado Exibido:**
   `Pokémon TCG: ${formatoNome} - ${colecaoNome}`
   Exemplo: *"Pokémon TCG: Booster Box (Display 36) - Escuridão Absoluta"*.

### 6.4. Agrupamento e Consolidação no Banco de Dados
- **Consulta Consolidada:** `GROUP BY COALESCE(h.chave_canonica, h.produto_limpo)`.
- **Menor Preço:** `MIN(h.preco_por)` entre todas as publicações agrupadas.
- **Maior Preço:** `MAX(h.preco_por)` histórico.
- **Preço Médio:** `ROUND(AVG(h.preco_por), 2)`.
- **Total de Postagens:** `COUNT(*)` somando todas as variações de títulos consolidadas.
- **Radar de Precificação Canônico no Gerador:** Busca primeiro por correspondência exata de `chave_canonica`. Qualquer título colado no Gerador encontra imediatamente o histórico canônico consolidado da família de produto.
