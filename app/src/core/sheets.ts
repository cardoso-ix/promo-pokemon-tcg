import fs from 'node:fs';
import { getConfig } from '../db/database.js';
import { formatarTituloPorSlug } from './anuncio.js';

export interface OfertaPlanilha {
  data: string;
  produto: string;
  valorPor: string;
  valorDe: string;
  link: string;
  grupo: string;
}

export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Cria cabeçalho automático se a planilha estiver vazia
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Data / Hora',
        'Nome do Produto',
        'Valor Promocional (Por)',
        'Valor Original (De)',
        'Link da Oferta',
        'Grupo de Origem'
      ]);
      // Deixar cabeçalho em negrito
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }

    sheet.appendRow([
      data.data || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      data.produto || 'Produto TCG',
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
}`;

/**
 * Extrai título limpo, preços (De / Por), data e link a partir da mensagem postada
 */
export function extrairDadosOferta(
  textoMensagem: string,
  resolvedUrl?: string,
  origemNome?: string
): OfertaPlanilha {
  const agoraFormatado = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const texto = String(textoMensagem || '').trim();
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Extração do Link
  let link = '';
  const urlMatch = texto.match(/https?:\/\/(?:meli\.la\/[^\s]+|mercadolivre\.com(?:\.br)?\/[^\s]+)/i);
  if (urlMatch) {
    link = urlMatch[0].replace(/[;,.:!?)\]*~"'_]+$/, '');
  } else if (resolvedUrl) {
    link = resolvedUrl;
  }

  // 2. Extração do Título do Produto
  let produto = '';
  // Se houver linha destacada com 📦
  const linhaCaixa = linhas.find((l) => l.includes('📦'));
  if (linhaCaixa) {
    produto = linhaCaixa.replace(/📦/g, '').replace(/[\*_~]/g, '').trim();
  }

  // Fallback para primeira linha substantiva
  if (!produto) {
    for (const linha of linhas) {
      const l = linha.replace(/[\*_~]/g, '').trim();
      const lower = l.toLowerCase();
      // Ignorar linhas de cabeçalho padrão, chamadas de ação, links ou preços
      if (
        l.length > 5 &&
        !lower.includes('super promoção') &&
        !lower.includes('promoção') &&
        !lower.includes('oferta') &&
        !lower.includes('frete') &&
        !lower.includes('aproveite') &&
        !lower.includes('compre aqui') &&
        !lower.includes('loja verificada') &&
        !/^de:?|^por:?|^apenas:?|^https?:/i.test(l) &&
        !/R\$\s*[\d\.,]+/i.test(l) &&
        !l.startsWith('🔗') &&
        !l.startsWith('@')
      ) {
        // Remover emojis decorativos iniciais
        produto = l.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\s]+/u, '').trim();
        break;
      }
    }
  }

  // Se ainda estiver vazio ou muito curto, extrair do slug da URL
  if ((!produto || produto.length < 5) && resolvedUrl) {
    const slugMatch = resolvedUrl.match(/mercadolivre\.com\.br\/([^\s"'<>]+?)\/(?:p\/|up\/|MLB-)/i);
    if (slugMatch && slugMatch[1]) {
      produto = formatarTituloPorSlug(slugMatch[1]);
    }
  }

  if (!produto) {
    produto = 'Colecionável Pokémon TCG';
  }

  // 3. Extração dos Preços (Valor Por e Valor De)
  let valorPor = '';
  let valorDe = '';

  // Procurar padrão "Por:" ou "Por apenas:"
  const porMatch = texto.match(/(?:👉🏼?|👉)?\s*\*?(?:por\s*apenas|por)[:\s\*👉🏼✅]*R?\$?\s*([\d\.,]+)/i);
  if (porMatch && porMatch[1]) {
    valorPor = normalizarMoeda(porMatch[1]);
  }

  // Procurar padrão "De:"
  const deMatch = texto.match(/(?:❌|~|\*)?\s*(?:de)[:\s\*~❌]*R?\$?\s*([\d\.,]+)/i);
  if (deMatch && deMatch[1]) {
    valorDe = normalizarMoeda(deMatch[1]);
  }

  // Se não encontrou pelo prefixo De/Por, busca valores monetários no texto
  if (!valorPor) {
    const allPrices = Array.from(texto.matchAll(/R\$\s*([\d\.,]+)/gi));
    if (allPrices.length >= 2) {
      valorDe = normalizarMoeda(allPrices[0][1]);
      valorPor = normalizarMoeda(allPrices[1][1]);
    } else if (allPrices.length === 1) {
      valorPor = normalizarMoeda(allPrices[0][1]);
    }
  }

  return {
    data: agoraFormatado,
    produto,
    valorPor: valorPor || 'Consultar',
    valorDe: valorDe || '',
    link,
    grupo: origemNome || 'Grupo Pokémon TCG'
  };
}

function normalizarMoeda(valorStr: string): string {
  let limpo = valorStr.trim().replace(/\.$/, '').replace(/,$/, '');
  if (!limpo.startsWith('R$')) {
    limpo = `R$ ${limpo}`;
  }
  return limpo;
}

/**
 * Envia uma linha para o Google Sheets via Webhook (Apps Script)
 * e também atualiza o arquivo local CSV em G:\Meu Drive (se disponível no Windows)
 */
export async function registrarOfertaPlanilha(
  oferta: OfertaPlanilha,
  customWebhookUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = (customWebhookUrl || getConfig('google_sheets_webhook_url', '')).trim();
  const ativo = getConfig('google_sheets_ativo', 'true') === 'true';

  // 1. Dual-write: Backup local no Google Drive Desktop (G:\Meu Drive) se estiver rodando no Windows
  try {
    const localCsvPath = 'G:\\Meu Drive\\produtos tcg valores.csv';
    if (fs.existsSync('G:\\Meu Drive')) {
      const escapeCsv = (campo: string) => `"${(campo || '').replace(/"/g, '""')}"`;
      const linha = [
        escapeCsv(oferta.data),
        escapeCsv(oferta.produto),
        escapeCsv(oferta.valorPor),
        escapeCsv(oferta.valorDe),
        escapeCsv(oferta.link),
        escapeCsv(oferta.grupo)
      ].join(',') + '\r\n';

      fs.appendFileSync(localCsvPath, linha, 'utf8');
      console.log(`[Google Sheets Local] Linha registrada com sucesso em: ${localCsvPath}`);
    }
  } catch (err: unknown) {
    // Ignorar falha local silenciosamente para não interromper a esteira
    console.warn('[Google Sheets Local] Aviso ao gravar em G:\\Meu Drive:', err instanceof Error ? err.message : String(err));
  }

  // 2. Se a integração em nuvem via Webhook não estiver ativa ou configurada
  if (!ativo || !webhookUrl) {
    return { ok: false, error: 'Webhook do Google Sheets não configurado ou integração desativada.' };
  }

  // 3. Disparo HTTP POST para o Webhook do Google Apps Script
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s para Google Script responder

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(oferta),
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (res.ok) {
      console.log(`[Google Sheets Nuvem] Oferta registrada na planilha com sucesso: "${oferta.produto}" (${oferta.valorPor})`);
      return { ok: true };
    } else {
      const errorText = await res.text().catch(() => '');
      console.warn(`[Google Sheets Nuvem] Google retornou status ${res.status}: ${errorText.slice(0, 100)}`);
      return { ok: false, error: `Google retornou status HTTP ${res.status}` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Google Sheets Nuvem] Erro ao enviar linha para o Google Sheets:', msg);
    return { ok: false, error: msg };
  }
}
