import crypto from 'node:crypto';

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export interface ConversionResult {
  novoTexto: string;
  linksConvertidos: number;
  hashConteudo: string;
  contemMercadoLivre: boolean;
  productImageUrl?: string;
  resolvedProductUrl?: string;
  canonicalProductId?: string;
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
    if (/^\d+$/.test(p)) {
      // Números (ex: 360, 480, 540) são especificações cruciais de produto
      if (s.includes(p)) {
        pts += 4; // Bônus alto para número exato
      } else {
        pts -= 2; // Penalidade se o slug não contém esse número específico
      }
    } else if (s.includes(p)) {
      pts += p.length >= 5 ? 2 : 1;
    }
  }
  return pts;
}

/**
 * Extrai o ID canônico único do produto ou anúncio do Mercado Livre
 */
export function extractCanonicalProductId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // 1. Padrão de catálogo /p/MLB12345678
  const catalogMatch = url.match(/\/p\/(MLB\d+)/i);
  if (catalogMatch) {
    return catalogMatch[1].toUpperCase();
  }

  // 2. Padrão /up/MLBU12345678
  const upMatch = url.match(/\/up\/(MLBU\d+)/i);
  if (upMatch) {
    return upMatch[1].toUpperCase();
  }

  // 3. Padrão anúncio direto MLB-123456789 ou MLB123456789
  const directMatch = url.match(/(?:item\/|produto\.mercadolivre\.com\.br\/|mercadolivre\.com\.br\/[^\/]+\/)?(MLB-?\d{6,14})/i);
  if (directMatch) {
    return directMatch[1].replace('-', '').toUpperCase();
  }

  return null;
}

/**
 * Valida se uma URL pertence legitimamente a uma foto oficial de produto do Mercado Livre
 * e não a banners de cabeçalho (ex: Meli+ 74,90/mês), logos, ícones ou exibidores de campanha.
 */
export function isImagemValidaProdutoMl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase().trim();

  // Rejeita banners de navegação, exibidores, logos e ícones
  if (
    u.includes('ui-navigation') ||
    u.includes('/navigation/') ||
    u.includes('navigation-') ||
    u.includes('exhibitor') ||
    u.includes('logo') ||
    u.includes('accessibility') ||
    u.includes('180x180')
  ) {
    return false;
  }

  // Rejeita banners promocionais de campanha e streamings (ex: -OO.webp, -OO.jpg)
  if (/-oo\.(?:webp|jpe?g|png)/i.test(u)) {
    return false;
  }

  // Se for imagem do domínio mlstatic, fotos legítimas de produto contêm _NP_
  if (u.includes('http2.mlstatic.com')) {
    if (!u.includes('_np_')) {
      return false;
    }
  }

  return true;
}

/**
 * Normaliza qualquer URL de foto do Mercado Livre para a variante de alta resolução 2X e JPG
 */
export function normalizarFotoMl(url: string): string {
  let u = String(url || '').trim()
    .replace(/&amp;/g, '&')
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\/g, '/')
    .replace(/\{sanitized_title\}/gi, ''); // Limpa token de placeholder se presente no og:image do ML

  if (u.startsWith('//')) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) return '';

  if (/http2\.mlstatic\.com/i.test(u)) {
    u = u.replace(/\.webp(?=\?|#|$)/i, '.jpg');
    u = u.replace(/-(I|W|V|G|B|C|T|A|E)(\.(?:jpe?g|png|webp))(?=\?|#|$)/i, '-O$2');
    if (/\/D_Q_NP_/i.test(u)) {
      u = u.replace(/\/D_Q_NP_/i, '/D_NQ_NP_');
    }
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
): Promise<{ resolvedUrl: string; productImageUrl?: string; rawHtml?: string }> {
  let currentUrl = shortUrl;
  let count = 0;
  let lastHtml = '';
  let productImageUrl: string | undefined;
  let wasSocial = false;

  while (count < maxRedirects) {
    try {
      if (currentUrl.includes('/social/')) {
        wasSocial = true;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

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
        if (currentUrl.includes('/social/')) {
          wasSocial = true;
        }
        count++;
      } else {
        lastHtml = await res.text();
        break;
      }
    } catch {
      break;
    }
  }

  if (currentUrl.includes('/social/')) {
    wasSocial = true;
  }

  // Se a URL final for uma vitrine /social/ de terceiro, extrai o produto real do HTML
  if (wasSocial && lastHtml) {
    const ogTitleMatch = lastHtml.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const pageTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

    const ogImageMatch = lastHtml.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    let ogImg = ogImageMatch ? ogImageMatch[1].trim().replace(/\{sanitized_title\}/gi, '') : '';

    // Verifica se a página social compartilha um produto específico (ex: link com ref ou lista de produto)
    const isGenericVitrine = !pageTitle || /minhas listas|recomenda[çc][õo]es|vitrine|perfil/i.test(pageTitle);

    let palavras = normalizarPalavras(textHint);
    if (!isGenericVitrine) {
      palavras = normalizarPalavras(`${pageTitle} ${textHint}`);
      if (ogImg && isImagemValidaProdutoMl(ogImg)) {
        productImageUrl = normalizarFotoMl(ogImg);
      }
    }

    const candidatos: { url: string; slug: string; img?: string; pontos: number }[] = [];

    // Tenta extrair produtos e fotos específicas a partir dos cards da vitrine (poly-card)
    // Secciona por limites de card (poly-card ou ui-search-layout__item) sem depender de <div id="
    const cardChunks = lastHtml.split(/(?=<div[^>]*class="[^"]*poly-card|<li[^>]*class="[^"]*ui-search-layout__item)/i);
    for (const c of cardChunks) {
      if (!c.includes('poly-card') && !c.includes('ui-search-layout__item')) continue;
      const linkMatch = c.match(/href="(https?:\/\/(?:www\.)?mercadolivre\.com\.br\/[^\s"'<>]+?\/(?:p\/MLB\d+|up\/MLBU\d+|MLB-\d+)[^"]*)"/i);
      const imgMatch = c.match(/(?:src|data-src)="(https?:\/\/http2\.mlstatic\.com\/[^\s"']+\.(?:webp|jpe?g|png))"/i);
      if (linkMatch) {
        const cleanUrl = linkMatch[1].split('?')[0].split('#')[0];
        const slugMatch = cleanUrl.match(/mercadolivre\.com\.br\/([^\s"'<>]+?)\/(?:p\/|up\/|MLB-)/i);
        const slug = slugMatch ? slugMatch[1] : '';
        const imgRaw = imgMatch ? imgMatch[1].replace(/\{sanitized_title\}/gi, '') : undefined;
        const img = imgRaw && isImagemValidaProdutoMl(imgRaw) ? normalizarFotoMl(imgRaw) : undefined;
        candidatos.push({
          url: cleanUrl,
          slug,
          img,
          pontos: pontuarSlug(slug, palavras)
        });
      }
    }

    // Se não encontrou por poly-card, usa o regex geral de URLs de produto no HTML
    if (candidatos.length === 0) {
      const regex = /(?:https?:\/\/)?(?:www\.)?mercadolivre\.com\.br\/([^\s"'<>]+)\/(p\/MLB\d+|up\/MLBU\d+|MLB-\d+)/gi;
      let match;
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
    }

    if (candidatos.length > 0) {
      candidatos.sort((a, b) => b.pontos - a.pontos);
      // Exige pontuação relevante para assumir que é o mesmo produto, ou adota se for o único candidato
      if (candidatos[0].pontos >= 2 || candidatos.length === 1) {
        currentUrl = candidatos[0].url;
        // Se ainda não temos a foto do produto, adota a foto do card correspondente se for válida
        if (!productImageUrl && candidatos[0].img && isImagemValidaProdutoMl(candidatos[0].img)) {
          productImageUrl = candidatos[0].img;
        }
      }
    }
  }

  // Se temos o HTML da página direta do anúncio (e NÃO era vitrine social), extrai a foto oficial
  if (lastHtml && !wasSocial && !productImageUrl && !currentUrl.includes('/social/')) {
    const ogMatch = lastHtml.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const ogClean = ogMatch && ogMatch[1] ? ogMatch[1].replace(/\{sanitized_title\}/gi, '').trim() : '';
    if (ogClean && isImagemValidaProdutoMl(ogClean)) {
      productImageUrl = normalizarFotoMl(ogClean);
    } else {
      const mlImgs = lastHtml.match(/https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/gi);
      if (mlImgs && mlImgs.length > 0) {
        const validImgs = mlImgs.filter(isImagemValidaProdutoMl);
        if (validImgs.length > 0) {
          productImageUrl = normalizarFotoMl(validImgs[0]);
        }
      }
    }
  }

  return { resolvedUrl: currentUrl, productImageUrl, rawHtml: lastHtml };
}

let cachedSocialLinks: Record<string, { link: string; expiresAt: number }> = {};

/**
 * Consulta a vitrine/perfil mobile do Mercado Livre e descobre o link de compartilhamento oficial (ex: https://mercadolivre.com/sec/...)
 */
export async function fetchSocialShortLink(mattWord: string): Promise<string | null> {
  const cleanWord = (mattWord || '').trim();
  if (!cleanWord) return null;

  const cached = cachedSocialLinks[cleanWord];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.link;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://www.mercadolivre.com.br/social/${cleanWord}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/"shareLink"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        const cleanLink = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
        if (cleanLink.startsWith('http')) {
          cachedSocialLinks[cleanWord] = {
            link: cleanLink,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
          };
          return cleanLink;
        }
      }
    }
  } catch (err) {
    console.warn('[Social Short Link] Falha ao resolver shareLink oficial:', err);
  }

  return null;
}

/**
 * Transforma uma URL do Mercado Livre injetando os parâmetros de afiliado
 */
export function buildAffiliateUrl(
  rawUrl: string,
  mattWord: string,
  mattTool: string,
  shortSocialUrl?: string
): string {
  try {
    const urlObj = new URL(rawUrl);

    // Se for vitrine de terceiros, perfil social ou cupom sem produto, redireciona para a vitrine do Eduardo
    if (urlObj.pathname.includes('/social/') || urlObj.pathname.startsWith('/cupons')) {
      if (shortSocialUrl && shortSocialUrl.trim().startsWith('http')) {
        return shortSocialUrl.trim();
      }
      return `https://www.mercadolivre.com.br/social/${mattWord}?matt_word=${mattWord}&matt_tool=${mattTool}&forceInApp=true`;
    }

    // Se for um link de encurtador (meli.la / ml.la) que não expandiu para produto, nunca anexa query params diretamente
    const host = urlObj.hostname.toLowerCase();
    if (host.includes('meli.la') || host.includes('ml.la')) {
      if (shortSocialUrl && shortSocialUrl.trim().startsWith('http')) {
        return shortSocialUrl.trim();
      }
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
  if (targetImageUrl && !isImagemValidaProdutoMl(targetImageUrl)) {
    console.warn(`[Download Foto] Imagem descartada por ser banner ou não pertencer a produto: ${targetImageUrl}`);
    targetImageUrl = '';
  }

  if (!targetImageUrl && productUrl && !productUrl.includes('/social/')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12s resiliente para resposta do ML

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      };
      if (cookie) headers['cookie'] = cookie;

      const res = await fetch(productUrl, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const html = await res.text();
      const ogMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const ogClean = ogMatch && ogMatch[1] ? ogMatch[1].replace(/\{sanitized_title\}/gi, '').trim() : '';
      if (ogClean && isImagemValidaProdutoMl(ogClean)) {
        targetImageUrl = normalizarFotoMl(ogClean);
      } else {
        const mlImgs = html.match(/https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/gi);
        if (mlImgs && mlImgs.length > 0) {
          const validImgs = mlImgs.filter(isImagemValidaProdutoMl);
          if (validImgs.length > 0) {
            targetImageUrl = normalizarFotoMl(validImgs[0]);
          }
        }
      }
    } catch (err) {
      console.warn('[Download Foto] Erro ao inspecionar anúncio:', err);
    }
  }

  if (!targetImageUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s para baixar imagem

    let res = await fetch(targetImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok && hintImageUrl && hintImageUrl !== targetImageUrl) {
      const controllerHint = new AbortController();
      const timeoutHint = setTimeout(() => controllerHint.abort(), 10000);
      res = await fetch(hintImageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        signal: controllerHint.signal
      });
      clearTimeout(timeoutHint);
    }

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
 * Normaliza quebras de linha e remove assinaturas de concorrentes
 */
export function cleanSpamLines(text: string, phrasesToRemove: string[]): string {
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (const rawPhrase of phrasesToRemove) {
    const p = rawPhrase.trim();
    if (!p) continue;
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`[\\*_~]*${escaped}[\\*_~]*`, 'gi');
    result = result.replace(regex, '');
  }

  result = result.replace(/^[ \t]+|[ \t]+$/gm, (m, offset, str) => {
    return '';
  });
  result = result.replace(/[ \t]+$/gm, '');
  result = result.replace(/^@(?:all|everyone)\b/gim, '');
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
  meliTag = '',
  shortSocialUrl = '',
  textHintExtra = ''
): Promise<ConversionResult> {
  const phrases = frasesRemoverRaw.split('\n');
  const cleanedText = cleanSpamLines(rawText, phrases);

  const rawUrls = cleanedText.match(URL_REGEX) || [];
  let novoTexto = cleanedText;
  let linksConvertidos = 0;
  let contemMercadoLivre = false;
  let productImageUrl: string | undefined;
  let resolvedProductUrl: string | undefined;

  for (const rawUrlWithPunct of rawUrls) {
    // Isolar pontuação final como ; , . ! ? ) ] * _ ~ " ' para não quebrar a URL
    let rawUrl = rawUrlWithPunct;
    let trailingPunctuation = '';
    const punctMatch = rawUrlWithPunct.match(/^(https?:\/\/[^\s]+?)([;,.:!?)\]*~"'_]+)$/);
    if (punctMatch) {
      rawUrl = punctMatch[1];
      trailingPunctuation = punctMatch[2];
    }

    let resolvedUrl = rawUrl;
    if (isMercadoLivreUrl(rawUrl)) {
      contemMercadoLivre = true;
      const combinedHint = textHintExtra ? `${cleanedText} ${textHintExtra}` : cleanedText;
      const expansion = await expandUrl(rawUrl, combinedHint, meliCookie);
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
      const affiliateUrl = buildAffiliateUrl(resolvedUrl, mattWord, mattTool, shortSocialUrl);

      let finalLink = affiliateUrl;
      const isAlreadyShort = finalLink.includes('meli.la/') || finalLink.includes('mercadolivre.com/sec/');
      const isSocialOrCoupon = resolvedUrl.includes('/social/') || resolvedUrl.includes('/cupons');

      if (meliCookie.trim() && !isAlreadyShort && !isSocialOrCoupon) {
        const short = await shortenToMeli(affiliateUrl, meliCookie, meliTag || mattWord);
        if (short) {
          finalLink = short;
        }
      }

      novoTexto = novoTexto.replace(rawUrlWithPunct, finalLink + trailingPunctuation);
      linksConvertidos++;
    }
  }

  const hashConteudo = generateContentHash(chatId, cleanedText);
  const canonicalProductId = extractCanonicalProductId(resolvedProductUrl || '') || undefined;

  return {
    novoTexto,
    linksConvertidos,
    hashConteudo,
    contemMercadoLivre,
    productImageUrl,
    resolvedProductUrl,
    canonicalProductId
  };
}
