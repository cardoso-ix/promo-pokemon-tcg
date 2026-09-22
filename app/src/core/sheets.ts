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

export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Webhook Google Sheets ativo e pronto para receber ofertas!' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(contents);

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
        !lower.startsWith('cupom') &&
        !lower.includes('cupom:') &&
        !lower.includes('novo cupom') &&
        !lower.includes('liberado') &&
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

  // Procurar padrão "Por:" ou "Por apenas:" (ignorando percentuais como "por 15%")
  const porMatch = texto.match(/(?:👉🏼?|👉)?\s*\*?(?:por\s*apenas|por)[:\s\*👉🏼✅]*R?\$?\s*([\d\.,]+)(?!\s*[%a-zA-Z])/i);
  if (porMatch && porMatch[1]) {
    valorPor = normalizarMoeda(porMatch[1]);
  }

  // Procurar padrão "De:" (garante que não seja percentual como "de 15%" ou contexto de cupom)
  const deMatch = texto.match(/(?:❌|~|\*)?\s*(?:de)[:\s\*~❌]*R?\$?\s*([\d\.,]+)(?!\s*[%a-zA-Z])/i);
  if (deMatch && deMatch[1]) {
    const idx = deMatch.index || 0;
    const trechoAntes = texto.slice(Math.max(0, idx - 15), idx).toLowerCase();
    if (!trechoAntes.includes('cupom')) {
      valorDe = normalizarMoeda(deMatch[1]);
    }
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
  const isTest = Boolean(customWebhookUrl && customWebhookUrl.trim());
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
    console.warn('[Google Sheets Local] Aviso ao gravar em G:\\Meu Drive:', err instanceof Error ? err.message : String(err));
  }

  // 2. Validação de ativação e URL
  if (!webhookUrl) {
    return { ok: false, error: 'Cole a URL do Webhook do Google Apps Script antes de testar ou salvar.' };
  }

  if (!isTest && !ativo) {
    return { ok: false, error: 'Sincronização com o Google Planilhas está desativada no painel.' };
  }

  if (webhookUrl.includes('docs.google.com/spreadsheets')) {
    return {
      ok: false,
      error: 'Você colou o link da planilha no navegador! O Webhook deve ser a URL gerada no Apps Script em "Implantar > Nova implantação > App da Web" (que termina com /exec).'
    };
  }

  if (webhookUrl.includes('script.google.com') && !webhookUrl.includes('/exec')) {
    return {
      ok: false,
      error: 'A URL do Webhook precisa terminar com "/exec". Verifique se você copiou o link da implantação (App da Web) e não do editor de código.'
    };
  }

  // 3. Disparo HTTP POST para o Webhook do Google Apps Script
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s resiliente

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
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
      let detalhe = `Status HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403 || errorText.includes('accounts.google.com')) {
        detalhe = 'Permissão negada pelo Google. Ao implantar no Apps Script, certifique-se de configurar "Quem tem acesso" como "Qualquer pessoa" (Anyone).';
      } else if (errorText.includes('Script function not found')) {
        detalhe = 'Função não encontrada no script. Atualize o código do Apps Script com o modelo do painel e crie uma nova versão de implantação.';
      } else if (errorText) {
        detalhe += `: ${errorText.slice(0, 100)}`;
      }
      return { ok: false, error: detalhe };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('abort')) {
      return { ok: false, error: 'Tempo limite esgotado (timeout de 15s). Verifique se o script foi implantado como App da Web.' };
    }
    return { ok: false, error: `Falha de rede ao conectar com o Google: ${msg}` };
  }
}
