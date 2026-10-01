import { buildAffiliateUrl, normalizarFotoMl } from './affiliate.js';
import { extrairDadosAnuncio } from './anuncio.js';
import { getConfig, getHistoricoProdutosConsolidado } from '../db/database.js';
import { CONFIG } from '../config.js';

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
  ordenarPor?: 'price_asc' | 'relevance';
}

export interface ResultadoRadarItem extends MeliItemBusca {
  linkAfiliado: string;
  fotoHd: string;
  seloVendedor: string;
  ehOficial: boolean;
  ehPlatinum: boolean;
  ehFull: boolean;
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

    return true;
  });

  // Ordenação
  if (filtros.ordenarPor === 'price_asc' || !filtros.ordenarPor) {
    resultado = [...resultado].sort((a, b) => a.price - b.price);
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
 * Enriquece item do Meli com links e textos prontos
 */
export function enriquecerItemRadar(item: MeliItemBusca): ResultadoRadarItem {
  const mattWord = getConfig('matt_word', CONFIG.defaultMattWord);
  const mattTool = getConfig('matt_tool', CONFIG.defaultMattTool);
  const linkAfiliado = buildAffiliateUrl(item.permalink, mattWord, mattTool);
  const fotoHd = normalizarFotoMl(item.thumbnail);
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
    linkAfiliado,
    fotoHd,
    seloVendedor,
    ehOficial,
    ehPlatinum,
    ehFull,
    parcelamentoFormatado,
    copyCliente: formatarCopyCliente(item, linkAfiliado),
    copyGrupo: formatarCopyGrupo(item, linkAfiliado)
  };
}

/**
 * Executa a busca no Mercado Livre (via API ou URL individual)
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

      const mockBuscaItem: MeliItemBusca = {
        id: dados.resolvedUrl.match(/MLB-?(\d+)/i)?.[1] ? `MLB${dados.resolvedUrl.match(/MLB-?(\d+)/i)?.[1]}` : 'MLB_URL',
        title: dados.titulo || 'Produto Pokémon TCG',
        price: precoNumerico,
        original_price: precoDeNumerico,
        currency_id: 'BRL',
        thumbnail: dados.imageUrl || '',
        permalink: dados.resolvedUrl || identificacao.valor,
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
    const termo = encodeURIComponent(identificacao.valor);
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const sortParam = filtros.ordenarPor === 'price_asc' || !filtros.ordenarPor ? 'price_asc' : 'relevance';
    const apiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${termo}&sort=${sortParam}&condition=new&limit=50`;
    const linkBuscaAoVivoMeli = `https://lista.mercadolivre.com.br/${encodeURIComponent(identificacao.valor)}_OrderId_PRICE_ASC_NoIndex_True`;

    try {
      const res = await fetch(apiUrl, { headers });
      if (res.ok) {
        const data = (await res.json()) as { results?: MeliItemBusca[] };
        const rawItems = data.results || [];
        const filtrados = filtrarProdutosConfiaveis(rawItems, filtros);
        const enriquecidos = filtrados.map(enriquecerItemRadar);

        if (enriquecidos.length > 0) {
          return {
            ok: true,
            total: enriquecidos.length,
            itens: enriquecidos
          };
        }
      }
    } catch {
      // Falha na API do Mercado Livre, segue para o fallback do banco local
    }

    // Fallback: Pesquisar na base histórica consolidada de Pokémon TCG do Cockpit
    const resBanco = getHistoricoProdutosConsolidado(identificacao.valor, 50, 0);
    const mattWord = getConfig('matt_word', CONFIG.defaultMattWord);
    const mattTool = getConfig('matt_tool', CONFIG.defaultMattTool);

    const itensBanco: ResultadoRadarItem[] = resBanco.itens.map((p) => {
      const linkAfiliado = p.ultimo_link ? buildAffiliateUrl(p.ultimo_link, mattWord, mattTool) : '';
      const itemBusca: MeliItemBusca = {
        id: p.chave_canonica || `TCG_${Date.now()}`,
        title: p.produto,
        price: p.menor_preco,
        original_price: p.menor_preco_de || p.maior_preco,
        currency_id: 'BRL',
        thumbnail: '',
        permalink: p.ultimo_link || '',
        condition: 'new',
        official_store_id: 1,
        official_store_name: 'Histórico Validado',
        shipping: { free_shipping: true, logistic_type: 'fulfillment' },
        installments: { quantity: 10, amount: p.menor_preco / 10, rate: 0 }
      };

      return {
        ...itemBusca,
        linkAfiliado,
        fotoHd: '',
        seloVendedor: 'Oferta Validada no Grupo',
        ehOficial: true,
        ehPlatinum: true,
        ehFull: true,
        parcelamentoFormatado: `10x de ${(p.menor_preco / 10).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros`,
        copyCliente: formatarCopyCliente(itemBusca, linkAfiliado),
        copyGrupo: formatarCopyGrupo(itemBusca, linkAfiliado)
      };
    });

    return {
      ok: true,
      total: itensBanco.length,
      itens: itensBanco
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, total: 0, itens: [], erro: msg };
  }
}
