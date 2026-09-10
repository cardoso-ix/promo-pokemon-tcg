import crypto from 'node:crypto';

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export interface ConversionResult {
  novoTexto: string;
  linksConvertidos: number;
  hashConteudo: string;
  contemMercadoLivre: boolean;
  productImageUrl?: string;
  resolvedProductUrl?: string;
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
};

const PALAVRAS_IRRELEVANTES = new Set([
  'pokemon', 'tcg', 'para', 'com', 'por', 'cada', 'cupom',
  'https', 'http', 'www', 'portugues', 'carta', 'cartas',
  'jogo', 'visite', 'pagina', 'encontre', 'todos', 'produtos',
  'club', 'promocoes', 'lugar', 'colecionaveis', 'copag'
]);

export function normalizarPalavras(texto: string): string[] {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length >= 3 && !PALAVRAS_IRRELEVANTES.has(w));
}

export function pontuarSlug(slug: string, palavras: string[]): number {
  const s = String(slug || '').toLowerCase();
  let pts = 0;
  for (const p of palavras) {
    if (s.includes(p)) pts += p.length >= 5 ? 2 : 1;
  }
  return pts;
}

/**
 * Normaliza qualquer URL de foto do Mercado Livre para a variante de alta resolução 2X e JPG
 */
export function normalizarFotoMl(url: string): string {
  let u = String(url || '').trim()
    .replace(/&amp;/g, '&')
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\/g, '/');

  if (u.startsWith('//')) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) return '';

  if (/http2\.mlstatic\.com/i.test(u)) {
    u = u.replace(/\.webp(?=\?|#|$)/i, '.jpg');
    u = u.replace(/-(I|W|V|G|B|C)(\.(?:jpe?g|png))(?=\?|#|$)/i, '-O$2');
    if (/\/D_NQ_NP_(?!2X_)/i.test(u)) {
      u = u.replace(/\/D_NQ_NP_/i, '/D_NQ_NP_2X_');
    }
  }
  return u;
}

/**
 * Segue redirecionamentos HTTP com GET (desencurta links como meli.la e extrai dados do anúncio)
 */
export async function expandUrl(
  shortUrl: string,
  textHint = '',
  cookie = '',
  maxRedirects = 4
): Promise<{ resolvedUrl: string; productImageUrl?: string }> {
  let currentUrl = shortUrl;
  let count = 0;
  let lastHtml = '';
  let productImageUrl: string | undefined;

  while (count < maxRedirects) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = { ...BROWSER_HEADERS };
      if (cookie) headers['cookie'] = cookie;

      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).href;
        count++;
      } else {
        lastHtml = await res.text();
        break;
      }
    } catch {
      break;
    }
  }

  // Se a URL final for uma vitrine /social/ de terceiro, extrai o produto real do HTML
  if (currentUrl.includes('/social/') && lastHtml) {
    const palavras = normalizarPalavras(textHint);
    const regex = /(?:https?:\/\/)?(?:www\.)?mercadolivre\.com\.br\/([^\s"'<>]+)\/(p\/MLB\d+|up\/MLBU\d+|MLB-\d+)/gi;
    let match;
    const candidatos: { url: string; slug: string; pontos: number }[] = [];

    while ((match = regex.exec(lastHtml)) !== null) {
      const full = match[0].startsWith('http') ? match[0] : 'https://' + match[0];
      const slug = match[1];
      const cleanUrl = full.split('#')[0].split('?')[0];
      candidatos.push({
        url: cleanUrl,
        slug,
        pontos: pontuarSlug(slug, palavras)
      });
    }

    if (candidatos.length > 0) {
      candidatos.sort((a, b) => b.pontos - a.pontos);
      // Exige pontuação relevante para assumir que é o mesmo produto
      if (candidatos[0].pontos >= 2) {
        currentUrl = candidatos[0].url;
      }
    }
  }

  // Se temos o HTML da página direta do anúncio (NÃO da vitrine /social/), extrai a imagem
  if (lastHtml && !productImageUrl && !currentUrl.includes('/social/')) {
    const ogMatch = lastHtml.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1] && !ogMatch[1].includes('{sanitized_title}')) {
      productImageUrl = normalizarFotoMl(ogMatch[1]);
    } else {
      const mlImgs = lastHtml.match(/https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/gi);
      if (mlImgs && mlImgs.length > 0) {
        productImageUrl = normalizarFotoMl(mlImgs[0]);
      }
    }
  }

  return { resolvedUrl: currentUrl, productImageUrl };
}

/**
 * Transforma uma URL do Mercado Livre injetando os parâmetros de afiliado
 */
export function buildAffiliateUrl(rawUrl: string, mattWord: string, mattTool: string): string {
  try {
    const urlObj = new URL(rawUrl);

    // Se for vitrine de terceiros ou cupom sem produto, redireciona para a vitrine do Eduardo
    if (urlObj.pathname.includes('/social/') && !urlObj.pathname.includes(mattWord)) {
      return `https://www.mercadolivre.com.br/social/${mattWord}?matt_word=${mattWord}&matt_tool=${mattTool}&forceInApp=true`;
    }

    if (urlObj.pathname.startsWith('/cupons')) {
      return `https://www.mercadolivre.com.br/social/${mattWord}?matt_word=${mattWord}&matt_tool=${mattTool}&forceInApp=true`;
    }

    // Limpar parâmetros anteriores de afiliados e tracking
    urlObj.searchParams.delete('matt_word');
    urlObj.searchParams.delete('matt_tool');
    urlObj.searchParams.delete('tracking_id');
    urlObj.searchParams.delete('af_sub1');
    urlObj.searchParams.delete('af_sub2');

    // Injetar tags oficiais do Eduardo
    urlObj.searchParams.set('matt_word', mattWord);
    urlObj.searchParams.set('matt_tool', mattTool);
    urlObj.searchParams.set('forceInApp', 'true');

    return urlObj.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Encurta uma URL longa de afiliado utilizando a API interna oficial do Mercado Livre com cookie
 */
export async function shortenToMeli(url: string, cookie: string, tag = 'myshoplist'): Promise<string | null> {
  const cleanCookie = cookie.trim();
  if (!cleanCookie) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://www.mercadolivre.com.br',
        'referer': 'https://www.mercadolivre.com.br/afiliados/linkbuilder',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'cookie': cleanCookie
      },
      body: JSON.stringify({
        urls: [url],
        tag: tag || 'myshoplist'
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Meli Shortener] Resposta HTTP ${res.status} ao encurtar link.`);
      return null;
    }

    const text = await res.text();
    // Procurar URLs no formato meli.la ou mercadolivre.com/sec/
    const match = text.match(/https?:\/\/(?:meli\.la|mercadolivre\.com\/sec\/)[a-zA-Z0-9_-]+/i);
    if (match) {
      return match[0];
    }

    try {
      const data = JSON.parse(text);
      if (data.short_url) return data.short_url;
      if (data.urls && data.urls[0] && (data.urls[0].short_url || data.urls[0].url)) {
        return data.urls[0].short_url || data.urls[0].url;
      }
    } catch {}

    return null;
  } catch (err: any) {
    console.warn('[Meli Shortener] Erro ao chamar API do Mercado Livre:', err?.message || err);
    return null;
  }
}

/**
 * Baixa o buffer da foto em alta resolução do anúncio do Mercado Livre
 */
export async function downloadProductImage(
  productUrl: string,
  cookie = '',
  hintImageUrl = ''
): Promise<Buffer | null> {
  let targetImageUrl = hintImageUrl ? normalizarFotoMl(hintImageUrl) : '';

  if (!targetImageUrl && productUrl && !productUrl.includes('/social/')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = { ...BROWSER_HEADERS };
      if (cookie) headers['cookie'] = cookie;

      const res = await fetch(productUrl, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const html = await res.text();
      const ogMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1] && !ogMatch[1].includes('{sanitized_title}')) {
        targetImageUrl = normalizarFotoMl(ogMatch[1]);
      } else {
        const mlImgs = html.match(/https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/gi);
        if (mlImgs && mlImgs.length > 0) {
          targetImageUrl = normalizarFotoMl(mlImgs[0]);
        }
      }
    } catch (err) {
      console.warn('[Download Foto] Erro ao inspecionar anúncio:', err);
    }
  }

  if (!targetImageUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(targetImageUrl, {
      headers: BROWSER_HEADERS,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length > 1000) {
        return buf;
      }
    }
  } catch (err) {
    console.warn('[Download Foto] Falha ao baixar bytes da imagem:', err);
  }

  return null;
}

/**
 * Verifica se a URL pertence ao ecossistema do Mercado Livre
 */
export function isMercadoLivreUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes('mercadolivre.com.br') ||
      host.includes('mercadolivre.com') ||
      host.includes('meli.la') ||
      host.includes('ml.la')
    );
  } catch {
    return false;
  }
}

/**
 * Limpa frases, arrobas e hashtags indesejadas (marcas concorrentes)
 */
export function cleanSpamLines(text: string, phrasesToRemove: string[]): string {
  let lines = text.split('\n');

  lines = lines.map((line) => {
    let l = line;
    // Remove marcações com formatação markdown como _@marca_ ou *@marca*
    l = l.replace(/[_*]{1,2}(@[a-zA-Z0-9._]+)[_*]{1,2}/gi, '$1');
    l = l.replace(/[_*]{1,2}(#[a-zA-Z0-9._]+)[_*]{1,2}/gi, '$1');

    for (const phrase of phrasesToRemove) {
      const p = phrase.trim();
      if (!p) continue;
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      l = l.replace(new RegExp(escaped, 'gi'), '');
    }

    // Se a linha tinha texto e após a remoção de marcas restou apenas pontuações residuais de markdown/espaço (ex: '__' ou ' _ ')
    if (line.trim().length > 0 && l.replace(/[*_~`#@\s]/g, '').length === 0) {
      return '';
    }
    return l;
  });

  // Preservar quebras de linha normais entre parágrafos, permitindo no máximo 1 linha em branco consecutiva (\n\n)
  let result = lines.join('\n');
  result = result.replace(/[ \t]+$/gm, '');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

/**
 * Gera um hash único baseado no texto normalizado sem os links
 */
export function generateContentHash(chatId: string, text: string): string {
  // Remove links para que variações de parâmetro não gerem duplicação
  const textWithoutLinks = text.replace(URL_REGEX, '').toLowerCase().replace(/\s+/g, '');
  return crypto.createHash('sha256').update(`${chatId}:${textWithoutLinks}`).digest('hex');
}

/**
 * Processa a mensagem completa: localiza URLs, desencurta, injeta afiliado e limpa marcas
 */
export async function processMessageText(
  rawText: string,
  chatId: string,
  mattWord: string,
  mattTool: string,
  frasesRemoverRaw: string,
  meliCookie = '',
  meliTag = ''
): Promise<ConversionResult> {
  const phrases = frasesRemoverRaw.split('\n');
  const cleanedText = cleanSpamLines(rawText, phrases);

  const urls = cleanedText.match(URL_REGEX) || [];
  let novoTexto = cleanedText;
  let linksConvertidos = 0;
  let contemMercadoLivre = false;
  let productImageUrl: string | undefined;
  let resolvedProductUrl: string | undefined;

  for (const rawUrl of urls) {
    let resolvedUrl = rawUrl;
    if (isMercadoLivreUrl(rawUrl)) {
      contemMercadoLivre = true;
      const expansion = await expandUrl(rawUrl, rawText, meliCookie);
      resolvedUrl = expansion.resolvedUrl;
      if (!resolvedUrl.includes('/social/')) {
        resolvedProductUrl = resolvedUrl;
      }
      if (expansion.productImageUrl) {
        productImageUrl = expansion.productImageUrl;
      }
    }

    if (isMercadoLivreUrl(resolvedUrl)) {
      contemMercadoLivre = true;
      const affiliateUrl = buildAffiliateUrl(resolvedUrl, mattWord, mattTool);

      let finalLink = affiliateUrl;
      if (meliCookie.trim()) {
        const short = await shortenToMeli(affiliateUrl, meliCookie, meliTag || mattWord);
        if (short) {
          finalLink = short;
        }
      }

      novoTexto = novoTexto.replace(rawUrl, finalLink);
      linksConvertidos++;
    }
  }

  const hashConteudo = generateContentHash(chatId, cleanedText);

  return {
    novoTexto,
    linksConvertidos,
    hashConteudo,
    contemMercadoLivre,
    productImageUrl,
    resolvedProductUrl
  };
}
