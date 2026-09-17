# Integração com Google Planilhas — "produtos tcg valores"

Esta funcionalidade registra de forma autônoma e em tempo real toda oferta enviada nos grupos de WhatsApp (seja por réplica automática dos grupos monitorados ou por envio manual no painel web) diretamente em uma planilha do Google Sheets.

---

## 1. Estrutura das Colunas da Planilha

A planilha registra 6 colunas para cada oferta disparada:

| Coluna | Campo | Exemplo | Descrição |
| :--- | :--- | :--- | :--- |
| **A** | **Data / Hora** | `17/09/2026, 14:26:34` | Data e horário oficial de Brasília em que a oferta foi postada. |
| **B** | **Nome do Produto** | `Box Pokémon Mega Lucario Ex Mega Evolução` | Nome do produto limpo, sem marcas concorrentes ou poluição visual. |
| **C** | **Valor Promocional (Por)** | `R$ 124,00` | Preço com desconto anunciado na promoção. |
| **D** | **Valor Original (De)** | `R$ 180,00` | Preço antes do desconto (quando disponível no anúncio). |
| **E** | **Link da Oferta** | `https://meli.la/1ejomo4` | Link oficial de afiliado do Mercado Livre. |
| **F** | **Grupo de Origem** | `Grupo VIP TCG` | Nome legível do grupo monitorado que originou a oferta. |

---

## 2. Como Configurar no Google Planilhas (Passo a Passo em 1 Minuto)

### Passo 1: Criar a Planilha no Google Drive
1. Abra seu Google Drive e crie uma planilha com o nome exato: **`produtos tcg valores`**.
   *(Nota: Se você usa o Google Drive for Desktop no Windows, o arquivo base `produtos tcg valores.csv` já foi criado automaticamente em `G:\Meu Drive\produtos tcg valores.csv` e está sincronizado).*

### Passo 2: Adicionar o Google Apps Script
1. No menu superior da planilha, clique em **Extensões** > **Apps Script**.
2. Apague qualquer código existente no editor e cole o código abaixo:

```javascript
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Webhook ativo!' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(contents);

    // Cria o cabeçalho automaticamente se a planilha estiver vazia
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Data / Hora',
        'Nome do Produto',
        'Valor Promocional (Por)',
        'Valor Original (De)',
        'Link da Oferta',
        'Grupo de Origem'
      ]);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }

    sheet.appendRow([
      data.data || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      data.produto || 'Colecionável Pokémon TCG',
      data.valorPor || '',
      data.valorDe || '',
      data.link || '',
      data.grupo || 'WhatsApp'
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Passo 3: Publicar como App da Web
1. No canto superior direito, clique no botão azul **Implantar** > **Nova implantação**.
2. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha **App da Web**.
3. Preencha as opções:
   - **Descrição**: `Webhook Promo TCG`
   - **Executar como**: `Eu (seu-email@gmail.com)`
   - **Quem tem acesso**: **`Qualquer pessoa`** *(Essencial para que o robô em nuvem no Railway consiga enviar os dados)*.
4. Clique em **Implantar**, autorize as permissões de acesso da sua conta Google e copie a **URL do app da web** gerada (ex: `https://script.google.com/macros/s/AKfycb.../exec`).

### Passo 4: Ativar no Cockpit Web do Replicador
1. Acesse o Cockpit Web do Replicador (ex: na aba **Configurações**).
2. Na seção **Google Planilhas — "produtos tcg valores"**, cole a URL copiada no campo **URL do Webhook do Google Apps Script**.
3. Clique em **🧪 Testar Planilha** para confirmar que a linha de teste aparece instantaneamente na sua planilha.
4. Clique em **Salvar Todas as Configurações**.

---

## 3. Arquitetura & Resiliência

- **Assíncrono & Fire-and-Forget**: A gravação da linha no Google Sheets roda em segundo plano. Não adiciona latência ao WhatsApp nem atrasa o envio de promoções.
- **Dual-Write Inteligente**: Quando executado em ambiente Windows local com o Google Drive montado (`G:\Meu Drive`), o sistema grava simultaneamente no CSV local e no Webhook da nuvem.
- **Operação 24/7 na Nuvem (Railway)**: O contêiner Docker envia via HTTPS para a API do Google Apps Script sem necessidade de credenciais de serviço do GCP ou renovação de tokens OAuth.
