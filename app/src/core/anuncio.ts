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
 * Guardião de Nicho TCG: Aceita Pokémon TCG, Yu-Gi-Oh!, Magic: The Gathering e todo o ecossistema TCG
 */
export function isProdutoTCG(texto?: string, titulo?: string, slug?: string): boolean {
  const combined = `${texto || ''} ${titulo || ''} ${slug || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Cupons e alertas promocionais do Mercado Livre são de interesse direto da comunidade TCG
  if (
    combined.includes('cupom') ||
    combined.includes('desconto no app') ||
    detectarMensagemCupom(texto || '') ||
    extrairCupom(texto || '') !== null
  ) {
    return true;
  }

  const termosAceitos = [
    // Franquias e Fabricantes Principais
    'pokemon', 'copag', 'pikachu', 'charizard', 'mewtwo', 'eevee',
    'yu-gi-oh', 'yugioh', 'konami',
    'magic the gathering', 'magic: the gathering', 'mtg', 'wizards of the coast',
    'one piece card game', 'one piece tcg', 'bandai',
    'lorcana', 'disney lorcana',
    'digimon card game',
    'dragon ball super card', 'dbs card',
    'star wars unlimited',
    // Termos de Produtos de Card Games
    'tcg', 'card game', 'card games', 'trading card',
    'booster', 'boosters', 'booster box',
    'etb', 'elite trainer box', 'treinador avancado',
    'blister', 'tripack', 'triple pack', 'quadpack',
    'fichario', 'pasta para cartas', 'portfolio',
    'sleeve', 'sleeves', 'shield', 'dragon shield', 'ultra pro',
    'deck', 'decks', 'deckbox', 'deck box',
    'playmat', 'play mat', 'tapete para cartas',
    'lata colecionavel', 'lata pokemon',
    'cartas colecionaveis', 'carta avulsa', 'cartas pokemon'
  ];

  return termosAceitos.some((termo) => combined.includes(termo));
}

export interface CalculoDesconto {
  percentualOff: number;
  economiaReais: string;
  economiaValor: number;
  tagDesconto: string;
}

/**
 * Extrai valor numérico de strings de moeda brasileira (ex: "R$ 389,90" -> 389.9)
 */
function parseValorMoeda(valorStr?: string): number {
  if (!valorStr) return 0;
  const limpo = valorStr
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

/**
 * Calcula porcentagem de desconto (% OFF) e valor economizado em reais
 */
export function calcularDesconto(precoDeStr?: string, precoPorStr?: string): CalculoDesconto | null {
  const de = parseValorMoeda(precoDeStr);
  const por = parseValorMoeda(precoPorStr);

  if (de <= 0 || por <= 0 || de <= por) {
    return null;
  }

  const percentualOff = Math.round(((de - por) / de) * 100);
  const economiaValor = de - por;
  const economiaReais = `R$ ${economiaValor.toFixed(2).replace('.', ',')}`;
  const tagDesconto = ` (${percentualOff}% OFF · Economia de ${economiaReais})`;

  return {
    percentualOff,
    economiaReais,
    economiaValor,
    tagDesconto
  };
}

/**
 * Detecta se a mensagem traz gatilhos de urgência ou escassez de estoque
 */
export function detectarGatilhoUrgencia(texto: string): boolean {
  if (!texto) return false;
  const regex = /(?:últimas|ultimas|poucas)\s+unidades|última\s+unidade|ultima\s+unidade|vai\s+acabar|corre(?:\s+que|\s+antes|!|\.|\s|$)|estoque\s+acabando|acabando\s+(?:o\s+)?estoque|oferta\s+muito\s+boa|oferta\s+rel[aâ]mpago|menor\s+pre[çc]o\s+hist[oó]rico|n[aã]o\s+perca/i;
  return regex.test(texto);
}

/**
 * Detecta se a mensagem tem foco principal em divulgação de cupom ou lista de ofertas
 */
export function detectarMensagemCupom(texto: string): boolean {
  if (!texto) return false;
  const regex = /(?:novos?\s+)?cupo(?:m|ns)(?:\s+no\s+app|\s+do\s+mercado|\s+de\s+desconto|\s+liberados?)?|use\s+(?:o\s+)?cupom|cupo(?:m|ns)\s+de\s+r\$|cupo(?:m|ns)\s+válidos?|cupom:\s*\*[a-z0-9]+\*|\bcupons\b/i;
  return regex.test(texto);
}

/**
 * Extrai o código do cupom mencionado no texto da oferta com alta precisão
 */
export function extrairCupom(texto: string): string | null {
  if (!texto) return null;

  const blacklist = [
    'DE', 'NO', 'DO', 'DA', 'PARA', 'COM', 'DESCONTO', 'APP', 'MERCADO', 'LIVRE',
    'TCG', 'POKEMON', 'NENHUM', 'NOVO', 'VALIDO', 'ATIVO', 'DISPONIVEL', 'LIBERADO',
    'ESPECIAL', 'HOJE', 'AGORA', 'AQUI', 'TODO', 'SITE', 'ITEM', 'ITEMS', 'PRODUTO',
    'PRODUTOS', 'CLIENTE', 'PRIMEIRA', 'COMPRA', 'APENAS', 'TODOS'
  ];

  const regexes = [
    /cupom\s*:\s*\*?([a-z0-9_\-]{3,25})\*?/i,
    /(?:use|com|aplique)\s+(?:o\s+)?cupom[:\s\*]+([a-z0-9_\-]{3,25})/i,
    /cupom\s+de\s+[^\n:]+:\s*\*?([a-z0-9_\-]{3,25})\*?/i,
    /\*cupom:\s*([a-z0-9_\-]{3,25})\*/i,
    // Cupom destacado em maiúsculas ou com dígitos (ex: "Cupom MELIKIDS", "Cupom 20OFF")
    /cupom\s+([A-Z0-9_\-]{3,25})/
  ];

  for (const regex of regexes) {
    const match = texto.match(regex);
    if (match && match[1]) {
      const code = match[1].trim().replace(/[\*_~]/g, '').toUpperCase();
      if (!blacklist.includes(code)) {
        return code;
      }
    }
  }

  return null;
}

/**
 * Extrai condições de parcelamento sem juros (ex: "(Até 10x s/Juros)", "10x sem juros", "4 vezes sem juros")
 */
export function extrairParcelamento(texto: string): string | null {
  if (!texto) return null;

  // 1. Padrão com valor da parcela: "10x de R$ 36,22 sem juros" ou "Até 10x de 36,22 s/ juros"
  const regexComValor = /(?:em\s+)?(?:at[eé]\s+)?(\d{1,2})\s*(?:x|vezes)\s+de\s+(?:R\$\s*)?([\d\.,]+)\s*(?:s\/\s*juros?|sem\s+juros?)/i;
  const matchComValor = texto.match(regexComValor);
  if (matchComValor && matchComValor[1] && matchComValor[2]) {
    const vezes = matchComValor[1];
    let valor = matchComValor[2].trim().replace(/\.$/, '').replace(/,$/, '');
    if (!valor.startsWith('R$')) valor = `R$ ${valor}`;
    return `💳 Em até ${vezes}x de ${valor} sem juros`;
  }

  // 2. Padrão direto: "(Até 10x s/Juros)", "10x sem juros", "4 vezes sem juros", "em até 12x s/ juros"
  const regexSimples = /(?:em\s+)?(?:at[eé]\s+)?(\d{1,2})\s*(?:x|vezes)\s*(?:s\/\s*juros?|sem\s+juros?)/i;
  const matchSimples = texto.match(regexSimples);
  if (matchSimples && matchSimples[1]) {
    const vezes = matchSimples[1];
    return `💳 Em até ${vezes}x sem juros`;
  }

  return null;
}

export interface DeterminarTipoParams {
  texto: string;
  hasProdutoEspecifico: boolean;
}

/**
 * Determina o tipo de template correto a aplicar.
 * Se houver produto específico identificado, a postagem NUNCA é classificada
 * como mero alerta de cupom avulso, garantindo que o produto e link sejam replicados.
 */
export function determinarTipoMensagem(params: DeterminarTipoParams): 'oferta' | 'urgencia' | 'cupom' {
  const { texto, hasProdutoEspecifico } = params;
  const isUrgencia = detectarGatilhoUrgencia(texto);

  // Se há um produto específico sendo ofertado, é sempre OFERTA (ou URGÊNCIA)
  // O cupom será adicionado como um detalhe de desconto dentro da própria oferta
  if (hasProdutoEspecifico) {
    return isUrgencia ? 'urgencia' : 'oferta';
  }

  // Se NÃO há produto específico, verifica se é divulgação de cupom geral / vitrine
  const isCupom = detectarMensagemCupom(texto);
  if (isCupom) {
    return 'cupom';
  }

  return isUrgencia ? 'urgencia' : 'oferta';
}

export interface FormatarReplicadaParams {
  tipo: 'oferta' | 'urgencia' | 'cupom';
  titulo: string;
  precoDe?: string;
  precoPor?: string;
  parcelamento?: string;
  cupom?: string;
  detalhesCupom?: string;
  linkAfiliado?: string;
  linkVitrineCurto?: string;
  textoOriginalHigienizado?: string;
}

/**
 * Formata a mensagem final replicada aplicando o Template Premium de Marca
 */
export function formatarMensagemReplicada(params: FormatarReplicadaParams): string {
  const { tipo, titulo, precoDe, precoPor, parcelamento, cupom, detalhesCupom, linkAfiliado, linkVitrineCurto, textoOriginalHigienizado } = params;
  const link = (linkAfiliado || linkVitrineCurto || '').trim();

  // Template 3: Cupons & Campanhas Promocionais
  // Quando o concorrente envia uma mensagem com lista de cupons, regras ou descontos:
  // Replica fielmente o que eles forneceram (com links convertidos e assinatura @pokemon_tcg_promo)
  if (tipo === 'cupom') {
    if (textoOriginalHigienizado && textoOriginalHigienizado.trim()) {
      const textoLimpo = textoOriginalHigienizado.replace(/^@pokemon_tcg_promo\s*/i, '').trim();
      const hasLink = /https?:\/\//i.test(textoLimpo);
      const vitrine = (linkVitrineCurto || linkAfiliado || '').trim();
      if (!hasLink && vitrine) {
        return `@pokemon_tcg_promo\n\n${textoLimpo}\n\n🛒 ${vitrine}`;
      }
      return `@pokemon_tcg_promo\n\n${textoLimpo}`;
    }

    const codCupom = (cupom || 'CUPOM NO APP').trim().toUpperCase();
    const vitrine = (linkVitrineCurto || linkAfiliado || '').trim();

    const linhas: string[] = [
      '@pokemon_tcg_promo',
      '',
      '🎟️ *NOVO CUPOM DO MERCADO LIVRE LIBERADO!* 🎟️',
      '',
      `🏷️ Cupom: *${codCupom}*`
    ];

    if (detalhesCupom && detalhesCupom.trim()) {
      linhas.push(`⚡ ${detalhesCupom.trim()}`);
    }

    linhas.push('');
    linhas.push('🛒 *Aproveite na vitrine oficial de Pokémon TCG:*');
    linhas.push(`👉 ${vitrine}`);
    return linhas.join('\n');
  }

  // Preço e Desconto (com proteção contra 'Consultar' ou valores nulos)
  const de = (precoDe || '').trim();
  const por = (precoPor || '').trim();
  const isPorValido = por && por.toLowerCase() !== 'consultar' && por !== '0' && por !== 'R$ 0';
  const isDeValido = de && de.toLowerCase() !== 'consultar' && de !== '0' && de !== 'R$ 0';
  const calculo = isPorValido && isDeValido ? calcularDesconto(de, por) : null;
  const tagDesconto = calculo ? calculo.tagDesconto : '';

  let linhaPrecoDe = '';
  if (isDeValido) {
    const valorDe = de.startsWith('R$') ? de : `R$ ${de}`;
    linhaPrecoDe = `❌ ~De: ${valorDe}~`;
  }

  let linhaPrecoPor = '';
  if (isPorValido) {
    const valorPor = por.startsWith('R$') ? por : `R$ ${por}`;
    linhaPrecoPor = `🔥 *Por apenas: ${valorPor}*${tagDesconto}`;
  }

  let linhaParcelamento = '';
  if (parcelamento && parcelamento.trim()) {
    linhaParcelamento = parcelamento.trim();
  }

  let linhaCupom = '';
  if (cupom && cupom.trim()) {
    linhaCupom = `🎟️ Cupom: *${cupom.trim().toUpperCase()}*`;
  }

  // Template 2: Alerta de Urgência & Escassez
  if (tipo === 'urgencia') {
    const linhas: string[] = [
      '@pokemon_tcg_promo',
      '',
      '🚨 *ATENÇÃO: ÚLTIMAS UNIDADES EM ESTOQUE!* 🚨',
      '',
      `📦 *${titulo.trim()}*`,
      ''
    ];

    if (linhaPrecoDe) linhas.push(linhaPrecoDe);
    if (linhaPrecoPor) linhas.push(linhaPrecoPor);
    if (linhaParcelamento) linhas.push(linhaParcelamento);
    if (linhaCupom) linhas.push(linhaCupom);

    linhas.push('');
    linhas.push('⚡ *Corre antes que acabe o estoque!*');
    linhas.push(`🛒 ${link}`);
    return linhas.join('\n');
  }

  // Template 1: Oferta Regular TCG (Padrão)
  const linhas: string[] = [
    '@pokemon_tcg_promo',
    '',
    `📦 *${titulo.trim()}*`,
    ''
  ];

  if (linhaPrecoDe) linhas.push(linhaPrecoDe);
  if (linhaPrecoPor) linhas.push(linhaPrecoPor);
  if (linhaParcelamento) linhas.push(linhaParcelamento);
  if (linhaCupom) linhas.push(linhaCupom);

  linhas.push('');
  linhas.push(`🛒 ${link}`);

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
