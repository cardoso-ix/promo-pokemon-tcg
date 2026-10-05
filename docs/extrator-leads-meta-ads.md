# Guia Operacional: Extrator de Leads do WhatsApp para Meta Ads

Este guia detalha a funcionalidade de extração, deduplicação e importação de contatos de grupos de Pokémon TCG para campanhas de **Público Personalizado (Customer List)** e **Lookalike 1% (Público Semelhante)** no Meta Ads.

---

## 1. Onde Acessar no Cockpit

1. Acesse o painel: `http://localhost:3000` (ou na VPS: `http://108.174.145.77:3000`).
2. Vá no módulo **Replicador** (ou clique no menu superior).
3. Na barra de abas secundárias, clique no botão **"Leads Meta Ads"** (destacado em azul com badge verde *NOVO*).

---

## 2. Como Funciona a Extração

* **Detecção Automática:** O sistema se comunica diretamente com o Baileys do WhatsApp conectado e lista todos os grupos participantes com seus nomes e total de membros.
* **Seleção Flexível:** Você pode marcar ou desmarcar grupos específicos, ou clicar em **"Marcar Todos"**.
* **Deduplicação Inteligente:** Se um membro participa de 2, 3 ou mais grupos diferentes de Pokémon TCG, ele é consolidado em **apenas 1 registro único**, eliminando redundâncias e poupando custos de anúncio.
* **Normalização E.164 (Padrão Meta):** Todos os números são formatados automaticamente com o código do país (`55` para o Brasil) + DDD (2 dígitos) + Número (8 ou 9 dígitos), sem caracteres especiais, parênteses ou traços.
* **Descarte de Bots:** O próprio número do chip logado é automaticamente identificado e ignorado na exportação.

---

## 3. Formatos Disponíveis para Download

### 🚀 1. Formato Oficial Meta Ads (CSV)
* **Cabeçalhos:** `phone,country`
* **Exemplo de conteúdo:**
  ```csv
  phone,country
  5511999998888,BR
  5521988887777,BR
  ```
* **Utilização:** Pronto para subida direta no Gerenciador de Anúncios sem necessidade de formatação manual.

### 📊 2. Planilha Completa para Excel (CSV)
* **Cabeçalhos:** `Telefone_Meta;Telefone_Formatado;Pais;Qtd_Grupos;Grupos;Admin`
* **Exemplo de conteúdo:**
  ```csv
  Telefone_Meta;Telefone_Formatado;Pais;Qtd_Grupos;Grupos;Admin
  5511999998888;+55 (11) 99999-8888;BR;2;"Pokémon TCG Brasil, Trocas SP";Não
  ```
* **Utilização:** Permite conferência visual, auditoria e controle de quais grupos cada membro pertence, com codificação BOM UTF-8 que abre nativamente no Microsoft Excel.

---

## 4. Passo a Passo no Gerenciador de Anúncios do Meta

### Passo 1: Subir o Público Personalizado
1. Acesse o **Meta Ads Manager** (`adsmanager.facebook.com`).
2. No menu lateral, vá em **Todos os recursos > Públicos (Audiences)**.
3. Clique no botão azul **Criar público > Público personalizado**.
4. Selecione a fonte: **Lista de clientes**.
5. Na tela seguinte, selecione a opção **"Não"** para a pergunta de valor do cliente.
6. Faça o upload do arquivo `meta_leads_pokemon_tcg_....csv`.
7. O Meta já mapeará as colunas `phone` (Telefone) e `country` (País). Clique em **Importar e criar**.

### Passo 2: Criar o Lookalike 1% (Público Semelhante)
1. Com o público da lista criado, selecione-o e clique em **Criar semelhante (Lookalike)**.
2. Em **Local do público**, selecione **Brasil**.
3. Em **Tamanho do público**, arraste para **1%** (~1,7 milhão de pessoas).
4. O algoritmo do Meta buscará brasileiros com interesses, páginas, grupos e hábitos idênticos aos colecionadores da sua lista.

### Passo 3: Ativação da Campanha (R$ 30,00 / dia)
1. Crie uma nova campanha com objetivo de **Cadastros (Leads)**.
2. No Conjunto de Anúncios:
   * **Público:** Selecione o **Lookalike 1%** criado.
   * **Orçamento diário:** R$ 30,00/dia.
   * **Destino:** Link da sua página de entrada ou convite direto do grupo de WhatsApp com Pixel configurado.
3. A campanha antiga (`29/09/2026`) continuará rodando com R$ 20,00/dia em paralelo para manter o fluxo diário ativo durante o aquecimento.
