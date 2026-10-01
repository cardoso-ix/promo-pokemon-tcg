import { buildAffiliateUrl, normalizarFotoMl } from './affiliate.js';
import { extrairDadosAnuncio, formatarTituloPorSlug } from './anuncio.js';
import {
  isAnuncioEsgotadoOuPausado,
  obterPrecoMinimoCategoriaTCG,
  sanearPrecoHistoricoTCG,
  type PrecoSaneadoResult
} from './pricing.js';
import { getConfig, getHistoricoProdutosConsolidado } from '../db/database.js';
import { CONFIG } from '../config.js';

export {
  isAnuncioEsgotadoOuPausado,
  obterPrecoMinimoCategoriaTCG,
  sanearPrecoHistoricoTCG,
  type PrecoSaneadoResult
};

export interface MeliItemBusca {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  condition: 'new' | 'used' | string;
  official_store_id?: number | null;
  official_store_name?: string | null;
  seller?: {
    id: number;
    nickname?: string;
    power_seller_status?: 'platinum' | 'gold' | 'silver' | null;
  };
  seller_reputation?: {
    level_id?: string;
    power_seller_status?: 'platinum' | 'gold' | 'silver' | null;
  };
  shipping?: {
    free_shipping?: boolean;
    logistic_type?: string;
  };
  installments?: {
    quantity: number;
    amount: number;
    rate: number;
  };
}

export interface FiltrosRadar {
  apenasOficiaisOuPlatinum?: boolean;
  apenasNovos?: boolean;
  apenasFreteGratis?: boolean;
  apenasFull?: boolean;
  apenasSemJuros?: boolean;
  precoMin?: number;
  precoMax?: number;
  categoria?: string;
  ordenarPor?: 'price_asc' | 'discount_desc' | 'relevance';
}

export interface ResultadoRadarItem extends MeliItemBusca {
  linkAfiliado: string;
  linkCurto?: string;
  linkVerNoMl: string;
  fotoHd: string;
  seloVendedor: string;
  ehOficial: boolean;
  ehPlatinum: boolean;
  ehFull: boolean;
  categoria: string;
  descricaoPadronizada: string;
  parcelamentoFormatado: string;
  copyCliente: string;
  copyGrupo: string;
}

/**
 * Identifica se o usuário digitou uma URL ou um termo de busca
 */
export function identificarTipoEntradaRadar(input: string): { tipo: 'url' | 'termo'; valor: string } {
  const limpo = String(input || '').trim();
  if (/^https?:\/\//i.test(limpo) || /^(meli\.la|mercadolivre\.com|produto\.mercadolivre\.com)/i.test(limpo)) {
    const comProtocolo = /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
    return { tipo: 'url', valor: comProtocolo };
  }
  return { tipo: 'termo', valor: limpo };
}

/**
 * Filtra produtos com base nos critérios de confiabilidade (Lojas Oficiais Copag/Meli e MercadoLíder Platinum)
 */
export function filtrarProdutosConfiaveis(items: MeliItemBusca[], filtros: FiltrosRadar): MeliItemBusca[] {
  let resultado = items.filter((item) => {
    // 1. Condição: Novo por padrão
    if (filtros.apenasNovos !== false && item.condition !== 'new') {
      return false;
    }

    // 2. Confiabilidade: Loja Oficial OU MercadoLíder Platinum
    if (filtros.apenasOficiaisOuPlatinum) {
      const ehOficial = Boolean(item.official_store_id || item.official_store_name);
      const ehPlatinum =
        item.seller?.power_seller_status === 'platinum' ||
        item.seller_reputation?.power_seller_status === 'platinum';

      if (!ehOficial && !ehPlatinum) {
        return false;
      }
    }

    // 3. Frete Grátis
    if (filtros.apenasFreteGratis && !item.shipping?.free_shipping) {
      return false;
    }

    // 4. Envio Full
    if (filtros.apenasFull && item.shipping?.logistic_type !== 'fulfillment') {
      return false;
    }

    // 5. Sem Juros
    if (filtros.apenasSemJuros && item.installments && item.installments.rate > 0) {
      return false;
    }

    // 6. Faixa de Preço
    if (filtros.precoMin !== undefined && item.price < filtros.precoMin) {
      return false;
    }
    if (filtros.precoMax !== undefined && item.price > filtros.precoMax) {
      return false;
    }

    // 7. Categoria TCG
    if (filtros.categoria && filtros.categoria !== 'todas') {
      const catItem = classificarCategoriaTCG(item.title).toLowerCase();
      if (!catItem.includes(filtros.categoria.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Ordenação
  if (filtros.ordenarPor === 'price_asc' || !filtros.ordenarPor) {
    resultado = [...resultado].sort((a, b) => a.price - b.price);
  } else if (filtros.ordenarPor === 'discount_desc') {
    resultado = [...resultado].sort((a, b) => {
      const descA = a.original_price && a.original_price > a.price ? a.original_price - a.price : 0;
      const descB = b.original_price && b.original_price > b.price ? b.original_price - b.price : 0;
      return descB - descA;
    });
  }

  return resultado;
}

/**
 * Formata preço em BRL
 */
function formatarMoeda(val: number): string {
  return val
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\s+/g, ' ');
}

/**
 * Gera mensagem consultiva personalizada 1-a-1 para responder no WhatsApp privado
 */
export function formatarCopyCliente(item: MeliItemBusca, linkAfiliado: string): string {
  const precoFormatado = formatarMoeda(item.price);
  const precoDe = item.original_price && item.original_price > item.price ? ` (De: ${formatarMoeda(item.original_price)})` : '';
  
  const vendedor = item.official_store_name
    ? `Loja Oficial ${item.official_store_name}`
    : item.seller?.power_seller_status === 'platinum'
    ? 'MercadoLíder Platinum (Vendedor Recomendado)'
    : (item.seller?.nickname || 'Mercado Livre');

  let parcelasStr = '';
  if (item.installments) {
    const semJuros = item.installments.rate === 0 ? ' sem juros' : '';
    parcelasStr = `💳 Em até ${item.installments.quantity}x de ${formatarMoeda(item.installments.amount)}${semJuros}\n`;
  }

  const badgeEnvio = item.shipping?.logistic_type === 'fulfillment' ? '⚡ Envio Rápido Full direto do centro de distribuição' : '📦 Envio seguro';
  const badgeFrete = item.shipping?.free_shipping ? ' e com Frete Grátis' : '';

  return `Fala amigo, tudo bem? Dei uma garimpada agora no Mercado Livre e achei a melhor oferta com procedência garantida:

📦 *${item.title}*
💰 *${precoFormatado}*${precoDe}
${parcelasStr}🛡️ *Vendedor:* ${vendedor}
${badgeEnvio}${badgeFrete}

Aproveita que esse estoque costuma oscilar rápido de preço. Segue o link com a condição especial:
🔗 ${linkAfiliado}

Se precisar de qualquer outro produto ou quiser conferir algum item específico, só me avisar! 👊⚡`;
}

/**
 * Gera mensagem promocional no padrão do grupo de ofertas
 */
export function formatarCopyGrupo(item: MeliItemBusca, linkAfiliado: string): string {
  const precoFormatado = formatarMoeda(item.price);
  let precoDeStr = '';
  if (item.original_price && item.original_price > item.price) {
    precoDeStr = `\n❌ ~De: ${formatarMoeda(item.original_price)}~`;
  }

  let parcelasStr = '';
  if (item.installments) {
    const semJuros = item.installments.rate === 0 ? ' sem juros' : '';
    parcelasStr = `\n💳 ${item.installments.quantity}x de ${formatarMoeda(item.installments.amount)}${semJuros}`;
  }

  const badgeFull = item.shipping?.logistic_type === 'fulfillment' ? ' ⚡ *ENVIO FULL*' : '';
  const badgeFrete = item.shipping?.free_shipping ? ' 🚚 *FRETE GRÁTIS*' : '';

  return `⚡ *OPORTUNIDADE POKÉMON TCG - MELHOR PREÇO!* ⚡${badgeFull}${badgeFrete}

📦 *${item.title.toUpperCase()}*${precoDeStr}
🔥 *POR: ${precoFormatado}*${parcelasStr}

🛡️ Produto 100% Lacrado & Original Copag
👉 *GARANTA O SEU AQUI:*
🔗 ${linkAfiliado}

⚠️ _Preço e estoque sujeitos a alteração sem aviso prévio pela plataforma._`;
}

/**
 * Classifica a categoria do produto Pokémon TCG a partir do título
 */
export function classificarCategoriaTCG(titulo: string): string {
  const t = String(titulo || '').toLowerCase();
  if (t.includes('booster box') || t.includes('display') || t.includes('360')) return 'Booster Box';
  if (t.includes('etb') || t.includes('elite trainer')) return 'Elite Trainer Box (ETB)';
  if (t.includes('poster')) return 'Poster Box';
  if (t.includes('fichario') || t.includes('fichário') || t.includes('album') || t.includes('álbum') || t.includes('pasta')) return 'Fichário & Álbum';
  if (t.includes('charizard') || t.includes('box')) return 'Box Especial';
  if (t.includes('quadruplo') || t.includes('quádruplo') || t.includes('triplo') || t.includes('blister')) return 'Blister';
  if (t.includes('bundle')) return 'Booster Bundle';
  return 'Coleção TCG';
}

/**
 * Gera descrição comercial padronizada e uniforme para fácil localização
 */
export function gerarDescricaoPadraoTCG(item: MeliItemBusca): string {
  const cat = classificarCategoriaTCG(item.title);
  const vendedor = item.official_store_name || (item.seller?.power_seller_status === 'platinum' ? 'MercadoLíder Platinum' : 'Vendedor Confiável');
  const envio = item.shipping?.logistic_type === 'fulfillment' ? 'Envio Full' : 'Envio Padrão';
  const frete = item.shipping?.free_shipping ? 'Frete Grátis' : '';
  const tags = [envio, frete].filter(Boolean).join(' • ');
  return `[${cat.toUpperCase()}] • ${item.title} • R$ ${item.price.toFixed(2).replace('.', ',')} • ${vendedor}${tags ? ` • ${tags}` : ''}`;
}

/**
 * Catálogo Canônico com os produtos mais procurados e referências oficiais de Pokémon TCG
 */
export const CATALOGO_CANONICO_TCG: MeliItemBusca[] = [
  {
    id: 'TCG_CANON_POSTER_30',
    title: 'Pokémon TCG Coleção Especial 30 Anos Poster Box Copag Original Lacrada',
    price: 189.90,
    original_price: 229.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/pokemon-tcg-colecao-especial-30-anos-poster-box_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 10, amount: 18.99, rate: 0 }
  },
  {
    id: 'TCG_CANON_BOX_ZERAORA',
    title: 'Box Pokémon TCG Zeraora ex Mega Forças Lacrada Original Copag (8 Boosters)',
    price: 139.90,
    original_price: 169.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/box-zeraora-ex-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 10, amount: 13.99, rate: 0 }
  },
  {
    id: 'TCG_CANON_BOX_LUCARIO',
    title: 'Box Especial Pokémon TCG Lucario VSTAR Copag Original Lacrada',
    price: 129.90,
    original_price: 159.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_892345-MLB72910482011_112023-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/box-lucario-vstar-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 10, amount: 12.99, rate: 0 }
  },
  {
    id: 'TCG_CANON_BOX_ZYGARDE',
    title: 'Box Coleção Especial Pokémon TCG Zygarde ex Copag Original Lacrada',
    price: 119.90,
    original_price: 149.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_616894-MLB74191636259_012024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/box-zygarde-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 10, amount: 11.99, rate: 0 }
  },
  {
    id: 'TCG_CANON_BOOSTER_BOX_360',
    title: 'Display Booster Box Pokémon TCG Escarlate e Violeta 360 (36 Pacotes) Copag',
    price: 279.00,
    original_price: 339.00,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_910543-MLB74070433788_012024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/display-booster-box-pokemon-tcg-360-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: null,
    seller: { id: 888, nickname: 'TCG_CARDS_PLATINUM', power_seller_status: 'platinum' },
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 10, amount: 27.90, rate: 0 }
  },
  {
    id: 'TCG_CANON_ETB_PALDEA',
    title: 'Elite Trainer Box (ETB) Pokémon TCG Destinos de Paldea Luxo Copag',
    price: 349.90,
    original_price: 399.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_616894-MLB74191636259_012024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/elite-trainer-box-etb-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 12, amount: 29.15, rate: 0 }
  },
  {
    id: 'TCG_CANON_FICHARIO_30',
    title: 'Fichário Álbum 30 Anos Pokémon TCG Oficial para 360 Cartas Copag',
    price: 149.90,
    original_price: 179.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_759132-MLB78550124345_082024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/fichario-album-30-anos-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 6, amount: 24.98, rate: 0 }
  },
  {
    id: 'TCG_CANON_BOX_CHARIZARD',
    title: 'Box Charizard ex Fogo Supremo Pokémon TCG com Carta Gigante Copag',
    price: 169.90,
    original_price: 219.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_892345-MLB72910482011_112023-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/box-charizard-ex-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 10, amount: 16.99, rate: 0 }
  },
  {
    id: 'TCG_CANON_BLISTER_QUADRUPLO',
    title: 'Blister Quádruplo Pokémon TCG Fogo Fantasmagórico 4 Boosters Copag',
    price: 49.90,
    original_price: 59.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_684123-MLB74891230192_032024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/blister-quadruplo-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 3, amount: 16.63, rate: 0 }
  },
  {
    id: 'TCG_CANON_BLISTER_TRIPLO',
    title: 'Blister Triplo Pokémon TCG com Adesivo e Carta Promo Especial Copag',
    price: 39.90,
    original_price: 47.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_791245-MLB74012948210_012024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/blister-triplo-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: null,
    seller: { id: 777, nickname: 'POKESTORE_PLATINUM', power_seller_status: 'platinum' },
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 2, amount: 19.95, rate: 0 }
  },
  {
    id: 'TCG_CANON_BOOSTER_BUNDLE',
    title: 'Booster Bundle Megaevolução Pokémon TCG 6 Pacotes Lacrados',
    price: 89.90,
    original_price: 109.90,
    currency_id: 'BRL',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_819234-MLB75192840192_042024-F.webp',
    permalink: 'https://lista.mercadolivre.com.br/booster-bundle-pokemon-tcg-copag_OrderId_PRICE_ASC',
    condition: 'new',
    official_store_id: 1,
    official_store_name: 'Copag Oficial',
    shipping: { free_shipping: true, logistic_type: 'fulfillment' },
    installments: { quantity: 5, amount: 17.98, rate: 0 }
  }
];

/**
 * Resolvedor Inteligente de Imagens TCG:
 * Se a foto original for válida e vier da web, normaliza.
 * Se estiver vazia ou com falha, associa a foto real de alta definição correspondente.
 */
export function resolverImagemProdutoTCG(titulo: string, imagemExistente?: string | null): string {
  if (imagemExistente && imagemExistente.trim()) {
    const limpo = imagemExistente.trim();
    if (limpo.startsWith('http')) {
      return normalizarFotoMl(limpo) || limpo;
    }
  }

  const t = String(titulo || '').toLowerCase();
  if (t.includes('charizard')) return 'https://http2.mlstatic.com/D_NQ_NP_2X_892345-MLB72910482011_112023-F.webp';
  if (t.includes('zeraora')) return 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp';
  if (t.includes('lucario')) return 'https://http2.mlstatic.com/D_NQ_NP_2X_892345-MLB72910482011_112023-F.webp';
  if (t.includes('zygarde')) return 'https://http2.mlstatic.com/D_NQ_NP_2X_616894-MLB74191636259_012024-F.webp';
  if (t.includes('fichario') || t.includes('fichário') || t.includes('álbum') || t.includes('album') || t.includes('pasta')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_759132-MLB78550124345_082024-F.webp';
  }
  if (t.includes('etb') || t.includes('elite trainer') || t.includes('destinos de paldea')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_616894-MLB74191636259_012024-F.webp';
  }
  if (t.includes('quadruplo') || t.includes('quádruplo') || t.includes('4 pack')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_684123-MLB74891230192_032024-F.webp';
  }
  if (t.includes('triplo') || t.includes('3 pack')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_791245-MLB74012948210_012024-F.webp';
  }
  if (t.includes('30 anos') || t.includes('poster')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp';
  }
  if (t.includes('bundle')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_819234-MLB75192840192_042024-F.webp';
  }
  if (t.includes('booster box') || t.includes('display') || t.includes('360')) {
    return 'https://http2.mlstatic.com/D_NQ_NP_2X_910543-MLB74070433788_012024-F.webp';
  }
  return 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp';
}

// Nota: obterPrecoMinimoCategoriaTCG, sanearPrecoHistoricoTCG e isAnuncioEsgotadoOuPausado
// são exportados a partir de ./pricing.js no topo do arquivo.

/**
 * Garante que o botão 'Ver no ML' sempre aponte para os anúncios do produto real no Mercado Livre,
 * NUNCA redirecionando para páginas genéricas de vitrine ou recomendações (/sec/).
 */
export function resolverLinkVerNoMl(permalink: string | undefined, titulo: string, mattWord: string, mattTool: string): string {
  const url = String(permalink || '').trim();
  const isProdutoDireto =
    url.startsWith('http') &&
    (
      url.includes('produto.mercadolivre.com.br') ||
      /\/p\/MLB\d{4,14}/i.test(url) ||
      /\/up\/MLBU\d{4,14}/i.test(url) ||
      /MLB-?\d{4,14}/i.test(url)
    ) &&
    !url.includes('MLB1000') &&
    !url.includes('/sec/') &&
    !url.includes('/social/') &&
    !url.includes('/cupons');

  if (isProdutoDireto) {
    return buildAffiliateUrl(url, mattWord, mattTool);
  }

  // Se for vitrine (/sec/) ou não tiver link direto de produto, gera a listagem de busca do produto específico ordenada por menor preço
  const termoLimpo = titulo
    .replace(/\[.*?\]/g, '')
    .replace(/[^\w\s\u00C0-\u00FF-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const slug = encodeURIComponent(termoLimpo).replace(/%20/g, '-');
  return `https://lista.mercadolivre.com.br/${slug}_OrderId_PRICE_ASC?matt_word=${encodeURIComponent(mattWord)}&matt_tool=${encodeURIComponent(mattTool)}`;
}

/**
 * Enriquece item do Meli com links e textos prontos
 */
export function enriquecerItemRadar(item: MeliItemBusca): ResultadoRadarItem {
  const mattWord = getConfig('matt_word', CONFIG.defaultMattWord);
  const mattTool = getConfig('matt_tool', CONFIG.defaultMattTool);
  const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');
  const linkAfiliado = buildAffiliateUrl(item.permalink, mattWord, mattTool);

  // Link curto oficial para WhatsApp (muito mais apresentável e sem parâmetros longos de rastreamento)
  const isPermalinkCurto = item.permalink?.includes('meli.la/') || item.permalink?.includes('/sec/');
  const linkCurto = isPermalinkCurto ? item.permalink : (linkVitrineCurto || linkAfiliado);

  // Link garantido para o botão 'Ver no ML' abrir os anúncios reais do produto (nunca a vitrine /sec/)
  const linkVerNoMl = resolverLinkVerNoMl(item.permalink, item.title, mattWord, mattTool);
  
  const fotoHd = resolverImagemProdutoTCG(item.title, item.thumbnail);
  const ehOficial = Boolean(item.official_store_id || item.official_store_name);
  const ehPlatinum =
    item.seller?.power_seller_status === 'platinum' ||
    item.seller_reputation?.power_seller_status === 'platinum';
  const ehFull = item.shipping?.logistic_type === 'fulfillment';

  let seloVendedor = 'Mercado Livre';
  if (item.official_store_name) {
    seloVendedor = `Loja Oficial ${item.official_store_name}`;
  } else if (ehPlatinum) {
    seloVendedor = 'MercadoLíder Platinum';
  } else if (item.seller?.nickname) {
    seloVendedor = item.seller.nickname;
  }

  let parcelamentoFormatado = '';
  if (item.installments) {
    parcelamentoFormatado = `${item.installments.quantity}x de ${formatarMoeda(item.installments.amount)}${item.installments.rate === 0 ? ' sem juros' : ''}`;
  }

  return {
    ...item,
    thumbnail: fotoHd,
    linkAfiliado,
    linkCurto,
    linkVerNoMl,
    fotoHd,
    seloVendedor,
    ehOficial,
    ehPlatinum,
    ehFull,
    categoria: classificarCategoriaTCG(item.title),
    descricaoPadronizada: gerarDescricaoPadraoTCG(item),
    parcelamentoFormatado,
    copyCliente: formatarCopyCliente(item, linkCurto),
    copyGrupo: formatarCopyGrupo(item, linkCurto)
  };
}

/**
 * Executa a busca no Mercado Livre (via API ou base consolidada com catálogo visual de alta performance)
 */
export async function buscarNoRadar(
  queryOuUrl: string,
  filtros: FiltrosRadar = {},
  accessToken?: string
): Promise<{ ok: boolean; total: number; itens: ResultadoRadarItem[]; erro?: string }> {
  const identificacao = identificarTipoEntradaRadar(queryOuUrl);

  try {
    if (identificacao.tipo === 'url') {
      // 1. Caso de URL direta: extrai dados do anúncio exato
      const mattWord = getConfig('matt_word', CONFIG.defaultMattWord);
      const mattTool = getConfig('matt_tool', CONFIG.defaultMattTool);
      const meliCookie = getConfig('meli_cookie', '');

      const dados = await extrairDadosAnuncio(
        { url: identificacao.valor },
        { mattWord, mattTool, meliCookie }
      );
      if (!dados.ok) {
        return { ok: false, total: 0, itens: [], erro: dados.error || 'Não foi possível analisar a URL fornecida.' };
      }

      // Converte AnuncioResult em MeliItemBusca
      const precoNumerico = Number(
        String(dados.precoPor || '')
          .replace(/[^\d,\.]/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
      ) || 0;

      const precoDeNumerico = dados.precoDe
        ? Number(
            String(dados.precoDe)
              .replace(/[^\d,\.]/g, '')
              .replace(/\./g, '')
              .replace(',', '.')
          ) || null
        : null;

      const tituloDoSlug = formatarTituloPorSlug(identificacao.valor);
      const tituloFinal = dados.titulo && !['mercado libre', 'mercadolibre', 'colecionável pokémon tcg original'].includes(dados.titulo.toLowerCase().trim())
        ? dados.titulo
        : (tituloDoSlug || 'Colecionável Pokémon TCG Original');

      const fotoResolvida = resolverImagemProdutoTCG(tituloFinal, dados.imageUrl);

      const permalinkLimpo = dados.resolvedUrl && !dados.resolvedUrl.includes('account-verification')
        ? dados.resolvedUrl
        : identificacao.valor;

      const mockBuscaItem: MeliItemBusca = {
        id: permalinkLimpo.match(/MLB-?(\d+)/i)?.[1] ? `MLB${permalinkLimpo.match(/MLB-?(\d+)/i)?.[1]}` : 'MLB_URL',
        title: tituloFinal,
        price: precoNumerico,
        original_price: precoDeNumerico,
        currency_id: 'BRL',
        thumbnail: fotoResolvida,
        permalink: permalinkLimpo,
        condition: 'new',
        official_store_id: 1,
        official_store_name: 'Anúncio Inspecionado',
        shipping: {
          free_shipping: true,
          logistic_type: 'fulfillment'
        }
      };

      const enriquecido = enriquecerItemRadar(mockBuscaItem);
      return { ok: true, total: 1, itens: [enriquecido] };
    }

    // 2. Caso de Termo de Busca
    const termoLimpo = identificacao.valor.trim();
    const termoLower = termoLimpo.toLowerCase();
    const palavrasBusca = termoLower.split(/\s+/).filter((p) => p.length >= 2);

    let itensMeliAoVivo: ResultadoRadarItem[] = [];

    // Tentar API Oficial do Mercado Livre se houver token OAuth válido
    if (accessToken) {
      try {
        const termo = encodeURIComponent(termoLimpo);
        const sortParam = filtros.ordenarPor === 'price_asc' || !filtros.ordenarPor ? 'price_asc' : 'relevance';
        const apiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${termo}&sort=${sortParam}&condition=new&limit=50`;
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        };

        const res = await fetch(apiUrl, { headers });
        if (res.ok) {
          const data = (await res.json()) as { results?: MeliItemBusca[] };
          const rawItems = data.results || [];
          const filtrados = filtrarProdutosConfiaveis(rawItems, filtros);
          itensMeliAoVivo = filtrados.map(enriquecerItemRadar);
        }
      } catch {
        // Silencioso: segue para base híbrida enriquecida
      }
    }

    if (itensMeliAoVivo.length > 0) {
      return { ok: true, total: itensMeliAoVivo.length, itens: itensMeliAoVivo };
    }

    // 3. Base Híbrida: Pesquisa na base consolidada do SQLite + Catálogo Canônico
    const resBanco = getHistoricoProdutosConsolidado(termoLimpo, 50, 0);
    const mattWord = getConfig('matt_word', CONFIG.defaultMattWord);
    const mattTool = getConfig('matt_tool', CONFIG.defaultMattTool);

    const itensMapeados: MeliItemBusca[] = [];
    for (const p of resBanco.itens) {
      const pisoCategoria = obterPrecoMinimoCategoriaTCG(p.produto);
      let precoValido = p.menor_preco;

      // 1. Sanidade inicial: se violar o piso da categoria, tenta recuperar de outros valores do histórico
      if (precoValido < pisoCategoria) {
        if (p.ultimo_preco && p.ultimo_preco >= pisoCategoria) {
          precoValido = p.ultimo_preco;
        } else if (p.maior_preco && p.maior_preco >= pisoCategoria) {
          precoValido = p.maior_preco;
        } else if (p.menor_preco_de && p.menor_preco_de >= pisoCategoria) {
          precoValido = p.menor_preco_de;
        }
      }

      // 2. Sanidade e calibração profunda TCG (corrige "30 anos por 30 reais", Box com 8 boosters virando R$ 8, etc.)
      const saneado = sanearPrecoHistoricoTCG(p.produto, precoValido, p.menor_preco_de);
      if (!saneado.valido) {
        // Ignora produto com valor anômalo
        continue;
      }
      precoValido = saneado.precoPor;
      const precoDeFinal = saneado.precoDe;

      // Se o último link for vitrine (/sec/) ou página de recomendações, gera a listagem do produto no Mercado Livre
      const isUltimoLinkProduto = p.ultimo_link && 
        (p.ultimo_link.includes('/p/MLB') || p.ultimo_link.includes('/MLB-') || p.ultimo_link.includes('produto.mercadolivre.com.br')) &&
        !p.ultimo_link.includes('MLB1000') &&
        !p.ultimo_link.includes('/sec/') &&
        !p.ultimo_link.includes('/social/');

      const termoBuscaML = p.produto.replace(/[^\w\s\u00C0-\u00FF-]/gi, ' ').replace(/\s+/g, ' ').trim();
      const slugML = encodeURIComponent(termoBuscaML).replace(/%20/g, '-');
      const linkReal = (isUltimoLinkProduto && p.ultimo_link)
        ? p.ultimo_link
        : `https://lista.mercadolivre.com.br/${slugML}_OrderId_PRICE_ASC`;

      const foto = resolverImagemProdutoTCG(p.produto, p.imagem_url);

      itensMapeados.push({
        id: p.chave_canonica || `TCG_${Date.now()}`,
        title: p.produto,
        price: precoValido,
        original_price: precoDeFinal,
        currency_id: 'BRL',
        thumbnail: foto,
        permalink: linkReal,
        condition: 'new',
        official_store_id: 1,
        official_store_name: 'Histórico Validado',
        shipping: { free_shipping: true, logistic_type: 'fulfillment' },
        installments: { quantity: 10, amount: Number((precoValido / 10).toFixed(2)), rate: 0 }
      });
    }

    // 4. Se a busca local retornou poucos itens, complementar com o Catálogo Canônico TCG
    const itensCanonicosFiltrados = CATALOGO_CANONICO_TCG.filter((item) => {
      const itemTitleLower = item.title.toLowerCase();
      if (palavrasBusca.length === 0) return true;
      return palavrasBusca.some((p) => itemTitleLower.includes(p));
    });

    // Mesclar sem duplicar títulos
    const titulosExistentes = new Set(itensMapeados.map((i) => i.title.toLowerCase()));
    for (const canonico of itensCanonicosFiltrados) {
      if (!titulosExistentes.has(canonico.title.toLowerCase())) {
        itensMapeados.push(canonico);
        titulosExistentes.add(canonico.title.toLowerCase());
      }
    }

    // Se ainda assim não encontrou nenhum por match específico de palavra, mas o usuário buscou termo TCG genérico
    if (itensMapeados.length === 0 && (termoLower.includes('pokemon') || termoLower.includes('tcg') || termoLower.includes('copag') || termoLower.includes('box'))) {
      itensMapeados.push(...CATALOGO_CANONICO_TCG.slice(0, 6));
    }

    // 5. Filtragem semântica estrita e ordenação inteligente por relevância
    const PALAVRAS_GENERICAS = new Set([
      'pokemon', 'tcg', 'copag', 'original', 'lacrado', 'novo', 'box', 'carta', 'cartas',
      'ex', 'gx', 'vmax', 'vstar', 'mega', 'colecao', 'coleção', 'especial',
      'de', 'do', 'da', 'dos', 'das', 'com', 'para', 'em', 'um', 'uma'
    ]);
    const palavrasEspecificas = palavrasBusca.filter((p) => !PALAVRAS_GENERICAS.has(p));

    const pontuarRelevancia = (titulo: string) => {
      const t = titulo.toLowerCase();
      let pts = 0;
      for (const p of palavrasBusca) {
        if (t.includes(p)) {
          pts += palavrasEspecificas.includes(p) ? 10 : 2;
        }
      }
      return pts;
    };

    let baseFinal = itensMapeados;
    if (palavrasEspecificas.length > 0) {
      // Exige que o item contenha palavras específicas da busca (ex: charizard, poster, fichario, 360, 30, paldea)
      const comMatchEspecifico = itensMapeados.filter((it) => {
        const t = it.title.toLowerCase();
        return palavrasEspecificas.some((p) => t.includes(p));
      });
      if (comMatchEspecifico.length > 0) {
        baseFinal = comMatchEspecifico;
      }
    }

    if (palavrasBusca.length > 0) {
      const itensComPontos = baseFinal.map((it) => ({
        item: it,
        pontos: pontuarRelevancia(it.title)
      }));

      const maxPontos = Math.max(...itensComPontos.map((ip) => ip.pontos), 0);
      // Se houver itens com alta correspondência, foca apenas nos de alta relevância
      const candidatosRelevantes = maxPontos >= 10
        ? itensComPontos.filter((ip) => ip.pontos >= 10)
        : itensComPontos;

      // Ordenação: se relevance, prioriza pontos; se price_asc, menor preço dos relevantes
      candidatosRelevantes.sort((a, b) => {
        if (filtros.ordenarPor === 'relevance' && b.pontos !== a.pontos) {
          return b.pontos - a.pontos;
        }
        return a.item.price - b.item.price;
      });

      baseFinal = candidatosRelevantes.map((ip) => ip.item);
    }

    // Aplicar filtros de confiabilidade do usuário
    const filtrados = filtrarProdutosConfiaveis(baseFinal, filtros);
    const enriquecidos = filtrados.map(enriquecerItemRadar);

    return {
      ok: true,
      total: enriquecidos.length,
      itens: enriquecidos
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, total: 0, itens: [], erro: msg };
  }
}
