import { expandUrl, normalizarFotoMl, shortenToMeli, buildAffiliateUrl } from './affiliate.js';

export interface AnuncioInput {
  url: string;
  cupom?: string;
  precoDe?: string;
  precoPor?: string;
}

export interface AnuncioResult {
  ok: boolean;
  titulo: string;
  imageUrl: string | null;
  textoGerado: string;
  linkAfiliado: string;
  resolvedUrl: string;
  error?: string;
}

/**
 * Converte slug de URL do Mercado Livre em título legível e formatado
 */
export function formatarTituloPorSlug(slug: string): string {
  if (!slug) return 'Colecionável Pokémon TCG Original';

  // Remover termos de identificação técnica ou códigos
  let limpo = slug
    .replace(/^https?:\/\/[^\/]+\//i, '')
    .replace(/\/p\/MLB\d+.*$/i, '')
    .replace(/\/up\/MLBU\d+.*$/i, '')
    .replace(/\/MLB-\d+.*$/i, '')
    .replace(/_JM.*$/i, '')
    .replace(/-/g, ' ')
    .trim();

  // Capitalizar palavras mantendo siglas
  const palavras = limpo.split(/\s+/).map((p) => {
    const lower = p.toLowerCase();
    if (['tcg', 'etb', 'box', 'copag', 'ex', 'gx', 'vmax', 'vstar', 'mlb'].includes(lower)) {
      return lower.toUpperCase();
    }
    if (['e', 'de', 'do', 'da', 'dos', 'das', 'com', 'para', 'em'].includes(lower)) {
      return lower;
    }
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  });

  let titulo = palavras.join(' ');

  // Garantir que a palavra Pokémon tenha acento correto se presente
  titulo = titulo.replace(/\bPokemon\b/gi, 'Pokémon');

  return titulo || 'Colecionável Pokémon TCG';
}

/**
 * Monta a copy promocional persuasiva para o WhatsApp
 */
export function gerarCopyPromocional(params: {
  titulo: string;
  linkAfiliado: string;
  cupom?: string;
  precoDe?: string;
  precoPor?: string;
}): string {
  const { titulo, linkAfiliado, cupom, precoDe, precoPor } = params;

  const linhas: string[] = [];

  linhas.push('🔥 *SUPER PROMOÇÃO POKÉMON TCG!* 🔥');
  linhas.push('');
  linhas.push(`📦 *${titulo.trim()}*`);
  linhas.push('');

  // Linhas de preço (se preenchidas)
  const de = (precoDe || '').trim();
  const por = (precoPor || '').trim();

  if (de && por) {
    const valorDe = de.startsWith('R$') ? de : `R$ ${de}`;
    const valorPor = por.startsWith('R$') ? por : `R$ ${por}`;
    linhas.push(`❌ ~De: ${valorDe}~`);
    linhas.push(`👉 *Por apenas: ${valorPor}*`);
    linhas.push('');
  } else if (por) {
    const valorPor = por.startsWith('R$') ? por : `R$ ${por}`;
    linhas.push(`👉 *Por apenas: ${valorPor}*`);
    linhas.push('');
  }

  // Linha de cupom opcional
  if (cupom && cupom.trim()) {
    const codCupom = cupom.trim().toUpperCase();
    linhas.push(`🎟️ Cupom de Desconto: *${codCupom}*`);
    linhas.push('');
  }

  linhas.push('⚡ Produto original com estoque e envio rápido!');
  linhas.push('');
  linhas.push('🛒 *Compre com desconto exclusivo aqui:*');
  linhas.push(`👉 ${linkAfiliado.trim()}`);
  linhas.push('');
  linhas.push('⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._');

  return linhas.join('\n');
}

/**
 * Extrai dados completos do anúncio a partir da URL colada pelo usuário
 */
export async function extrairDadosAnuncio(
  input: AnuncioInput,
  config: {
    mattWord: string;
    mattTool: string;
    meliCookie?: string;
    meliTag?: string;
  }
): Promise<AnuncioResult> {
  const rawUrl = (input.url || '').trim();
  if (!rawUrl) {
    return {
      ok: false,
      titulo: '',
      imageUrl: null,
      textoGerado: '',
      linkAfiliado: '',
      resolvedUrl: '',
      error: 'Por favor, informe a URL do produto ou link de afiliado.'
    };
  }

  try {
    // 1. Expandir a URL (trata meli.la, mercadolivre.com/sec/ e vitrines /social/)
    const { resolvedUrl, productImageUrl } = await expandUrl(
      rawUrl,
      'Pokemon TCG',
      config.meliCookie || ''
    );

    const targetUrl = resolvedUrl || rawUrl;

    // 2. Extrair slug e título
    let slug = '';
    const slugMatch = targetUrl.match(/mercadolivre\.com\.br\/([^\s"'<>]+?)\/(?:p\/|up\/|MLB-)/i);
    if (slugMatch) {
      slug = slugMatch[1];
    } else {
      // Tentar pegar do pathname
      try {
        const u = new URL(targetUrl);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          slug = parts[0];
        }
      } catch {}
    }

    let titulo = formatarTituloPorSlug(slug);

    // 3. Obter a foto oficial em alta resolução (2X)
    let imageUrl: string | null = productImageUrl ? normalizarFotoMl(productImageUrl) : null;

    if (!imageUrl && targetUrl && !targetUrl.includes('/social/')) {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        });
        if (res.ok) {
          const html = await res.text();
          const ogTitle = html.match(
            /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i
          );
          if (ogTitle && ogTitle[1]) {
            const parsedTitle = ogTitle[1].replace(/\s*\|\s*Mercado\s*Livre.*$/i, '').trim();
            if (parsedTitle && parsedTitle.length > 5) {
              titulo = parsedTitle;
            }
          }

          const ogImg = html.match(
            /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i
          );
          if (ogImg && ogImg[1] && !ogImg[1].includes('{sanitized_title}')) {
            imageUrl = normalizarFotoMl(ogImg[1]);
          } else {
            const mlImgs = html.match(
              /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/gi
            );
            if (mlImgs && mlImgs.length > 0) {
              imageUrl = normalizarFotoMl(mlImgs[0]);
            }
          }
        }
      } catch (err) {
        console.warn('[Anúncio Extrator] Falha ao inspecionar página:', err);
      }
    }

    // 4. Determinar o Link de Afiliado Final:
    // Se o operador já colou um link com sec/ ou meli.la próprio, respeitamos exatamente o que ele colou!
    let linkAfiliadoFinal = rawUrl;
    const isAlreadyShortAffiliate =
      /mercadolivre\.com\/sec\//i.test(rawUrl) || /meli\.la\//i.test(rawUrl);

    if (!isAlreadyShortAffiliate) {
      // Injetar tags de afiliado
      const affiliateLongUrl = buildAffiliateUrl(
        targetUrl,
        config.mattWord,
        config.mattTool
      );

      // Tentar encurtar com meli.la se cookie estiver disponível
      if (config.meliCookie && config.meliCookie.length > 10) {
        const short = await shortenToMeli(
          affiliateLongUrl,
          config.meliCookie,
          config.meliTag || config.mattWord
        );
        if (short) {
          linkAfiliadoFinal = short;
        } else {
          linkAfiliadoFinal = affiliateLongUrl;
        }
      } else {
        linkAfiliadoFinal = affiliateLongUrl;
      }
    }

    // 5. Montar a Copy
    const textoGerado = gerarCopyPromocional({
      titulo,
      linkAfiliado: linkAfiliadoFinal,
      cupom: input.cupom,
      precoDe: input.precoDe,
      precoPor: input.precoPor
    });

    return {
      ok: true,
      titulo,
      imageUrl,
      textoGerado,
      linkAfiliado: linkAfiliadoFinal,
      resolvedUrl: targetUrl
    };
  } catch (err: any) {
    return {
      ok: false,
      titulo: '',
      imageUrl: null,
      textoGerado: '',
      linkAfiliado: rawUrl,
      resolvedUrl: rawUrl,
      error: err?.message || 'Falha ao processar link.'
    };
  }
}
