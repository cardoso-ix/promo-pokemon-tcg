import fs from 'node:fs';
import { getConfig } from '../db/database.js';
import { formatarTituloPorSlug, parseValorMoeda, extrairPrecoUnitario } from './anuncio.js';

export interface OfertaPlanilha {
  data: string;
  produto: string;
  valorPor: string;
  valorDe: string;
  valorUnitario?: string;
  link: string;
  grupo: string;
}

/**
 * Detecta se uma linha é clickbait, pergunta de engajamento ou cabeçalho comercial (não é produto)
 */
function isLinhaClickbaitOuCabecalho(linha: string): boolean {
  const l = (linha || '').replace(/[\*_~]/g, '').trim();
  if (!l || l.length < 3) return true;

  // Perguntas promocionais terminadas em ? (ex: "Tá Afim de Gastar Pouco?")
  if (/\?\s*$/m.test(l)) return true;

  const lower = l.toLowerCase();

  const termosEngajamento = [
    'gastar pouco', 'afim de', 'a fim de', 'olha esse', 'olha essa', 'olha isso',
    'olha o preco', 'olha o preço', 'quem avisa', 'achadinho', 'da uma olhada',
    'dá uma olhada', 'veja isso', 'corre', 'imperdivel', 'imperdível', 'surreal',
    'loucura', 'nao perca', 'não perca', 'super promocao', 'super promoção',
    'promocao', 'promoção', 'oferta', 'frete', 'aproveite', 'compre aqui',
    'loja verificada', 'loja oficial', 'visite a pagina', 'encontre todos os produtos',
    'novo cupom', 'liberado', 'link aqui', 'oferta aqui', 'estoque limitado',
    'promocao sujeita', 'promoção sujeita', 'vendido por', 'entregue por',
    'menor preco', 'menor preço', 'apenas hoje', 'so hoje', 'só hoje',
    'atencao', 'atenção', 'alerta'
  ];

  if (termosEngajamento.some((t) => lower.includes(t))) {
    return true;
  }

  // Linhas de preços, URLs, cupons, arrobas ou cabeçalhos de lojas
  if (/^de:?|^por:?|^apenas:?|^https?:/i.test(l)) return true;
  if (/^R\$\s*[\d\.,]+/i.test(l)) return true;
  if (l.startsWith('🔗') || l.startsWith('@') || /^[\u{1F39F}\u{1F3AB}\u{1F3F7}]/u.test(l)) return true;

  return false;
}

/**
 * Calcula a pontuação semântica de uma linha para determinar se é o título do produto real
 */
function pontuarLinhaProduto(linha: string): number {
  const l = (linha || '').replace(/[\*_~]/g, '').trim();
  if (l.length < 4) return -100;
  if (isLinhaClickbaitOuCabecalho(l)) return -100;

  const lower = l.toLowerCase();
  let score = 10;

  // Multiplicador no início ou meio (ex: 2X, 3X, 4X, Combo, Kit, Pack)
  if (/(?:^|\s|\b)(\d+\s*[xX])(?:\s|\b)/i.test(l) || lower.includes('combo') || lower.includes('kit') || lower.includes('pack')) {
    score += 45;
  }

  // Palavras-chave essenciais de Pokémon TCG e colecionáveis
  const termosTCG = [
    'booster', 'copag', 'escuridao absoluta', 'escuridão absoluta', 'fichario', 'fichário',
    'pasta', 'blister', 'deck', 'box', 'evolucoes', 'evoluções', 'colecao', 'coleção',
    'cartas', 'pokemon', 'pokémon', 'display', 'sleeves', 'shield', 'triple pack',
    'quad pack', 'etb', 'elite trainer box', 'lata', 'tin', 'bundle', 'poster collection',
    'destinos de paldea', 'chamas obsidiana', '151', 'origem perdida', 'cinzas do tempo',
    'tempestade prateada', 'coroa estelar', 'faiscas volumosas', 'faíscas volumosas',
    'forca temporal', 'força temporal', 'mascaras do crepusculo', 'máscaras do crepúsculo',
    'fogo supremo', 'parafuso', 'glauco', 'treinador avancado', 'treinador avançado'
  ];

  for (const t of termosTCG) {
    if (lower.includes(t)) {
      score += 35;
      break;
    }
  }

  // Marcadores visuais de produto (👉, 📦, 🃏, ✨)
  if (/^[👉📦🃏✨🏷️]/u.test(l)) {
    score += 15;
  }

  // Presença de bandeiras de país (🇧🇷, 🇺🇸, 🇯🇵)
  if (/[\u{1F1E6}-\u{1F1FF}]{2}/u.test(l)) {
    score += 15;
  }

  return score;
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

  // 2. Extração do Título do Produto com Sistema de Pontuação (anti-clickbait)
  let produto = '';
  let melhorScore = -999;
  let melhorLinha = '';

  for (const linha of linhas) {
    const l = linha.replace(/[\*_~]/g, '').trim();
    if (!l || l.length < 3) continue;

    // Se a linha for o link ou preço Por/De explícito ou cabeçalho clickbait descartável
    if (/^https?:/i.test(l) || l.startsWith('🔗') || l.startsWith('@')) continue;
    if (isLinhaClickbaitOuCabecalho(l)) continue;
    if (/^(?:❌|~+)?\s*(?:de:?|por:?|apenas:?)\s*R?\$?\s*\d+/i.test(l)) continue;
    if (/^\(?\s*(?:apenas\s*)?R?\$?\s*\d+(?:[.,]\d+)*\s*(?:cada|cd|unidade)\)?$/i.test(l)) continue;

    const score = pontuarLinhaProduto(l);
    if (score > melhorScore) {
      melhorScore = score;
      melhorLinha = l;
    }
  }

  if (melhorLinha && melhorScore > 0) {
    const flagsNaLinha = melhorLinha.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu);
    const flagsStr = flagsNaLinha ? flagsNaLinha.join(' ') : '';
    const bandeiraNoInicio = /^[\u{1F1E6}-\u{1F1FF}]{2}/u.test(melhorLinha.trim());
    const semBandeiras = melhorLinha.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '').trim();
    const textoSemDecoracao = semBandeiras
      .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\s~_—–\->:]+/u, '')
      .trim();

    if (flagsStr) {
      if (bandeiraNoInicio) {
        produto = `${flagsStr} ${textoSemDecoracao}`;
      } else {
        produto = `${textoSemDecoracao} ${flagsStr}`;
      }
    } else {
      produto = textoSemDecoracao || melhorLinha;
    }
  }

  // Fallback 1: Se houver linha destacada com 📦 que não seja clickbait
  if (!produto) {
    const linhaCaixa = linhas.find((l) => l.includes('📦') && !isLinhaClickbaitOuCabecalho(l));
    if (linhaCaixa) {
      produto = linhaCaixa.replace(/📦/g, '').replace(/[\*_~]/g, '').trim();
    }
  }

  // Fallback 2: Primeira linha substantiva que não seja clickbait
  if (!produto) {
    for (const linha of linhas) {
      const l = linha.replace(/[\*_~]/g, '').trim();
      if (l.length > 5 && !isLinhaClickbaitOuCabecalho(l) && !/^https?:/i.test(l) && !/R\$\s*[\d\.,]+/i.test(l) && !l.startsWith('🔗') && !l.startsWith('@')) {
        produto = l.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s*~_—–-]+/u, '').trim();
        break;
      }
    }
  }

  // Preservar bandeira de país se existir no texto da mensagem e ainda não estiver no título do produto
  const bandeiraNoTexto = texto.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu);
  if (bandeiraNoTexto && bandeiraNoTexto.length > 0) {
    const primeiraBandeira = bandeiraNoTexto[0];
    if (!produto.includes(primeiraBandeira)) {
      produto = `${produto} ${primeiraBandeira}`;
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

  // Regex Por com barreira anti-backtracking de dígitos (?!\d) e bloqueio estrito de % e parcelas (x/vezes)
  // Aceita perfeitamente sufixos promocionais normais: "reais", "no pix", "a vista", "cada", "com cupom", etc.
  const porMatch = texto.match(
    /(?:👉🏼?|👉)?\s*\*?(?:por\s*apenas|por)[:\s\*👉🏼✅]*R?\$?\s*(\d+(?:[.,]\d+)*)(?!\d)(?!\s*[%xX]|\s*vezes)/i
  );
  if (porMatch && porMatch[1]) {
    valorPor = normalizarMoeda(porMatch[1]);
  }

  // Regex De com barreira anti-backtracking de dígitos (?!\d)
  // Exige marcador explícito (❌, ~, dois pontos ou R$ obrigatório) e rejeita preposições comuns
  // do português (ex: "Fichário de 30 anos", "Box de 36 boosters", "Pacote de 10 unidades")
  const deMatch = texto.match(
    /(?:(?:❌|~+)\s*[*~_]*\s*(?:de:?|R\$)?|(?:\bde)\s*(?::|[*~_]*\s*R\$))\s*[*~_]*\s*(?:R\$\s*)?(\d+(?:[.,]\d+)*)(?!\d)(?!\s*(?:anos?|dias?|mes(?:es)?|horas?|cartas?|cards?|boosters?|unidades?|unids?|und?|pe[çc]as?|pcs?|sleeves?|p[áa]ginas?|pags?|bolsos?|folhas?|vezes|[xX%]))/i
  );
  if (deMatch && deMatch[1]) {
    const idx = deMatch.index || 0;
    const trechoAntes = texto.slice(Math.max(0, idx - 20), idx).toLowerCase();
    const isCupom = trechoAntes.includes('cupom');
    const isParcela = /\d+\s*(?:x|vezes)\s*$/.test(trechoAntes);

    if (!isCupom && !isParcela) {
      valorDe = normalizarMoeda(deMatch[1]);
    }
  }

  // Se não encontrou pelo prefixo De/Por, busca valores monetários no texto
  // Ignora parcelas ("10x de R$...") e cupons ("cupom de R$...")
  if (!valorPor) {
    const allMatches = Array.from(texto.matchAll(/R\$\s*(\d+(?:[.,]\d+)*)(?!\d)/gi));
    const precosCandidatos: string[] = [];

    for (const m of allMatches) {
      const idx = m.index || 0;
      const trechoAntes = texto.slice(Math.max(0, idx - 25), idx).toLowerCase();
      const trechoDepois = texto.slice(idx, idx + 25).toLowerCase();

      // Ignora se for parcela (ex: "10x de R$...", "10x R$...")
      const isParcela = /\d+\s*(?:x|vezes)\s*(?:de\s*)?$/i.test(trechoAntes);
      // Ignora se for cupom (ex: "cupom de R$...")
      const isCupom = /cupom\s*(?:de\s*)?$/i.test(trechoAntes);
      // Ignora se for percentual
      const isPorcento = /^R\$\s*\d+%/i.test(trechoDepois);

      if (!isParcela && !isCupom && !isPorcento) {
        precosCandidatos.push(m[1].trim());
      }
    }

    if (precosCandidatos.length >= 2) {
      if (!valorDe) valorDe = normalizarMoeda(precosCandidatos[0]);
      valorPor = normalizarMoeda(precosCandidatos[1]);
    } else if (precosCandidatos.length === 1) {
      valorPor = normalizarMoeda(precosCandidatos[0]);
      // Se a mensagem original só contém 1 valor monetário e nenhum De explícito válido,
      // garante que valorDe permaneça vazio
      if (!texto.match(/(?:❌|~)\s*de:?|\bde:\s*R?\$?|\bde\s*R\$/i)) {
        valorDe = '';
      }
    }
  }

  // 4. Validação e Consistência Numérica de Desconto:
  // Se o preço De for menor ou igual ao preço Por, descarta o De (é falso positivo ou número de anos/cartas)
  if (valorDe && valorPor) {
    const numDe = parseValorMoeda(valorDe);
    const numPor = parseValorMoeda(valorPor);
    if (numPor > 0 && numDe <= numPor) {
      valorDe = '';
    }
  }

  // 5. Extração de Preço Unitário (se houver, ex: "(APENAS 11,90 CADA)")
  const precoUnitarioExtraido = extrairPrecoUnitario(texto);

  return {
    data: agoraFormatado,
    produto,
    valorPor: valorPor || 'Consultar',
    valorDe: valorDe || '',
    valorUnitario: precoUnitarioExtraido || undefined,
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
