import { expandUrl, normalizarFotoMl, shortenToMeli, buildAffiliateUrl, isImagemValidaProdutoMl } from './affiliate.js';

export interface AnuncioInput {
  url: string;
  cupom?: string;
  precoDe?: string;
  precoPor?: string;
  valorComCupom?: string;
  parcelamento?: string;
}

export interface AnuncioResult {
  ok: boolean;
  titulo: string;
  imageUrl: string | null;
  textoGerado: string;
  linkAfiliado: string;
  resolvedUrl: string;
  precoDe?: string;
  precoPor?: string;
  cupom?: string;
  valorComCupom?: string;
  parcelamento?: string;
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
 * Detalhes estruturados de preço e cupons extraídos da página
 */
export interface DetalhesProdutoMl {
  titulo?: string;
  precoDe?: string;
  precoPor?: string;
  cupom?: string;
  valorComCupom?: string;
  parcelamento?: string;
}

/**
 * Extrai preços (De/Por), cupons, descontos e parcelamento diretamente do HTML do Mercado Livre
 */
export function extrairDetalhesPrecoECupom(html: string, slugDesejado?: string): DetalhesProdutoMl {
  let precoDe = '';
  let precoPor = '';
  let cupom = '';
  let valorComCupom = '';
  let parcelamento = '';
  let tituloExtraido = '';

  if (!html) return {};

  // 1. Tentar primeiro extração de alta precisão via JSON de estado do produto principal do Mercado Livre
  const jsonPriceMatch = html.match(/"type":"price"(?:,"id":"price")?[^}]*"current_price":\{"value":([\d\.]+)/);
  if (jsonPriceMatch) {
    const valCurrent = parseFloat(jsonPriceMatch[1]);
    if (!isNaN(valCurrent) && valCurrent > 0) {
      precoPor = Number.isInteger(valCurrent)
        ? String(valCurrent)
        : valCurrent.toFixed(2).replace('.', ',');
    }

    const jsonBlock = html.substring(jsonPriceMatch.index || 0, (jsonPriceMatch.index || 0) + 400);
    const jsonPrevMatch = jsonBlock.match(/"(?:previous_price|original_price)":\{"value":([\d\.]+)/);
    if (jsonPrevMatch) {
      const valPrev = parseFloat(jsonPrevMatch[1]);
      if (!isNaN(valPrev) && valPrev > valCurrent) {
        precoDe = Number.isInteger(valPrev)
          ? String(valPrev)
          : valPrev.toFixed(2).replace('.', ',');
      }
    }

    // Parcelamento estritamente sem juros no JSON
    const instMatch = jsonBlock.match(/"installments":\{"text":"([^"]+)","no_interest":(true|false)/);
    if (instMatch && instMatch[2] === 'true') {
      const priceValMatch = jsonBlock.match(/"price":\{"value":([\d\.]+)/);
      const parcelaNum = priceValMatch ? parseFloat(priceValMatch[1]) : 0;
      const parcelaStr = Number.isInteger(parcelaNum) ? String(parcelaNum) : parcelaNum.toFixed(2).replace('.', ',');
      parcelamento = instMatch[1].replace('{price}', `R$ ${parcelaStr}`) + ' sem juros';
    }
  }

  // 2. Delimitar escopo do HTML para evitar poluição de carrosséis de recomendações ou produtos patrocinados
  let escopoHtml = html;
  if (slugDesejado && html.includes(slugDesejado)) {
    const cardChunks = html.split(/(?=<div[^>]*class="[^"]*poly-card|<li[^>]*class="[^"]*ui-search-layout__item)/i);
    for (const c of cardChunks) {
      if (c.includes(slugDesejado)) {
        escopoHtml = c;
        break;
      }
    }
  } else {
    // Para página de produto individual, delimita tudo antes de recomendações
    const corte = html.search(/<section[^>]*class="[^"]*(?:ui-recommendations|recommendations|poly-carousel|poly-card)/i);
    if (corte > 0) {
      escopoHtml = html.substring(0, corte);
    }
  }

  function extrairCampos(bloco: string) {
    // Título em card ou PDP se disponível
    const cardTitleMatch = bloco.match(/class="[^"]*(?:poly-component__title|ui-search-item__title|ui-pdp-title)[^"]*"[^>]*>([^<]+)</i) ||
                           bloco.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                           bloco.match(/<h2[^>]*class="[^"]*poly-box[^"]*"[^>]*>([^<]+)<\/h2>/i);
    if (!tituloExtraido && cardTitleMatch && cardTitleMatch[1]) {
      tituloExtraido = cardTitleMatch[1].trim();
    }

    // 1. Extração de Preço "De" (Original / Riscado)
    if (!precoDe) {
      const prevAria = bloco.match(/aria-label="Antes:\s*(\d+)\s*reais(?:(?:\s*com\s*|\s*e\s*)(\d+)\s*centavos)?"/i);
      if (prevAria) {
        const r = prevAria[1];
        const c = prevAria[2] ? prevAria[2].padStart(2, '0') : '';
        const deCand = c && c !== '00' ? `${r},${c}` : r;
        if (deCand !== precoPor) {
          precoDe = deCand;
        }
      } else {
        const prevBlock = bloco.match(/(?:andes-money-amount--previous|poly-price__previous|poly-price__former)[\s\S]*?<span[^>]*class="andes-money-amount__fraction[^"]*"[^>]*>([\d\.,]+)<\/span>(?:[\s\S]*?<span[^>]*class="andes-money-amount__cents[^"]*"[^>]*>(\d+)<\/span>)?/i);
        if (prevBlock) {
          const frac = prevBlock[1].replace(/\./g, '');
          const cents = prevBlock[2] ? prevBlock[2].padStart(2, '0') : '';
          const deCand = cents && cents !== '00' ? `${frac},${cents}` : frac;
          if (deCand !== precoPor) {
            precoDe = deCand;
          }
        }
      }
    }

    // 2. Extração de Preço "Por" (Atual / A Pagar)
    if (!precoPor) {
      const currAria = bloco.match(/aria-label="(?:Agora:\s*)?(\d+)\s*reais(?:(?:\s*com\s*|\s*e\s*)(\d+)\s*centavos)?"/i);
      if (currAria) {
        const r = currAria[1];
        const c = currAria[2] ? currAria[2].padStart(2, '0') : '';
        precoPor = c && c !== '00' ? `${r},${c}` : r;
      } else {
        const currBlock = bloco.match(/(?:poly-price__current|andes-money-amount--current|ui-pdp-price__second-line)[\s\S]*?<span[^>]*class="andes-money-amount__fraction[^"]*"[^>]*>([\d\.,]+)<\/span>(?:[\s\S]*?<span[^>]*class="andes-money-amount__cents[^"]*"[^>]*>(\d+)<\/span>)?/i);
        if (currBlock) {
          const frac = currBlock[1].replace(/\./g, '');
          const cents = currBlock[2] ? currBlock[2].padStart(2, '0') : '';
          precoPor = cents && cents !== '00' ? `${frac},${cents}` : frac;
        }
      }
    }

    // 3. Extração de Cupom
    if (!cupom) {
      const couponMatch = bloco.match(/"type":"coupon"[^}]*"text":"([^"]+)"/i) ||
                          bloco.match(/<span[^>]*class="[^"]*(?:coupon|cupom|poly-coupon)[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                          bloco.match(/cupom(?:\s+de)?:\s*([A-Z0-9_\-\%]+(?:\s*OFF)?)/i);
      if (couponMatch) {
        let raw = couponMatch[1].replace(/\{[^}]+\}/g, '').trim();
        const isTermoGenerico = /^(?:com\s+cupom(?:\s+no\s+app)?|cupom(?:\s+de\s+desconto)?|sem\s+cupom)$/i.test(raw);
        if (raw && !isTermoGenerico) {
          cupom = raw;
        }
      }
    }

    // 4. Extração de Parcelamento (sem juros)
    if (!parcelamento) {
      const instMatch = bloco.match(/(?:class="poly-price__installments"[^>]*>)?(\d{1,2}x)\s*(?:de\s*)?<span[^>]*aria-label="(\d+)\s*reais(?:(?:\s*com\s*|\s*e\s*)(\d+)\s*centavos)?"/i) ||
                        bloco.match(/(\d{1,2}x\s+(?:de\s+)?R\$\s*[\d\.,]+\s*sem\s+juros)/i) ||
                        bloco.match(/(\d{1,2}x\s+sem\s+juros)/i);
      if (instMatch) {
        const matchIdx = instMatch.index || 0;
        const trechoEntorno = bloco.substring(Math.max(0, matchIdx - 20), Math.min(bloco.length, matchIdx + instMatch[0].length + 80));
        const temTextoSemJuros = /sem\s+juros|s\/\s*juros|"no_interest":\s*true/i.test(trechoEntorno);

        if (instMatch[2]) {
          const numx = instMatch[1];
          const r = instMatch[2];
          const c = instMatch[3] ? instMatch[3].padStart(2, '0') : '00';
          const valorParcelaNum = parseFloat(`${r}.${c}`);
          const vezesNum = parseInt(numx.replace(/\D/g, ''), 10);

          let temJurosMatematico = false;
          if (precoPor && !isNaN(valorParcelaNum) && !isNaN(vezesNum)) {
            const precoPorNum = parseFloat(precoPor.replace(/\./g, '').replace(',', '.'));
            if (!isNaN(precoPorNum) && precoPorNum > 0) {
              if (vezesNum * valorParcelaNum > precoPorNum * 1.03) {
                temJurosMatematico = true;
              }
            }
          }

          if (temTextoSemJuros && !temJurosMatematico) {
            parcelamento = `${numx} de R$ ${r},${c} sem juros`;
          }
        } else if (temTextoSemJuros) {
          const textoLimpo = instMatch[1].trim();
          if (/sem\s+juros|s\/\s*juros/i.test(textoLimpo)) {
            parcelamento = textoLimpo;
          }
        }
      }
    }
  }

  // Tenta primeiro no escopo isolado
  extrairCampos(escopoHtml);

  // Se faltou precoPor e o escopo era restrito por busca de slug em vitrine, tenta no HTML global
  if (!precoPor && slugDesejado && escopoHtml !== html) {
    extrairCampos(html);
  }

  // Sanitização: se precoDe for igual a precoPor, anula precoDe
  if (precoDe && precoPor && precoDe.trim() === precoPor.trim()) {
    precoDe = '';
  }

  // 5. Cálculo automático de Valor com Cupom
  if (precoPor && cupom) {
    const numPor = parseFloat(precoPor.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(numPor) && numPor > 0) {
      const pctMatch = cupom.match(/(\d+)%/);
      if (pctMatch) {
        const pct = parseInt(pctMatch[1], 10);
        if (pct > 0 && pct < 100) {
          const comDesc = numPor * (1 - pct / 100);
          valorComCupom = comDesc.toFixed(2).replace('.', ',');
        }
      } else {
        const fixMatch = cupom.match(/R\$\s*(\d+(?:[\.,]\d{2})?)/i) || cupom.match(/(\d+)\s*reais/i);
        if (fixMatch) {
          const valDesc = parseFloat(fixMatch[1].replace(',', '.'));
          if (!isNaN(valDesc) && valDesc > 0 && valDesc < numPor) {
            const comDesc = numPor - valDesc;
            valorComCupom = comDesc.toFixed(2).replace('.', ',');
          }
        }
      }
    }
  }

  return {
    titulo: tituloExtraido || undefined,
    precoDe: precoDe || undefined,
    precoPor: precoPor || undefined,
    cupom: cupom || undefined,
    valorComCupom: valorComCupom || undefined,
    parcelamento: parcelamento || undefined
  };
}

/**
 * Monta a copy promocional limpa, persuasiva e direta para o WhatsApp
 * Contém estritamente:
 * 1. Nome do produto
 * 2. Valores DE / POR (ou só POR se não houver DE)
 * 3. Cupom e Valor com Cupom (se informados)
 * 4. Link apenas
 * 5. Rodapé: Preço e estoque promocional sujeitos a alteração a qualquer momento.
 */
export function gerarCopyPromocional(params: {
  titulo: string;
  linkAfiliado: string;
  cupom?: string;
  precoDe?: string;
  precoPor?: string;
  valorComCupom?: string;
  parcelamento?: string;
}): string {
  const { titulo, linkAfiliado, cupom, precoDe, precoPor, valorComCupom } = params;

  const linhas: string[] = [];

  // 1. Nome do produto (com bandeira se houver)
  const flagMatch = (titulo || '').match(/^([\u{1F1E6}-\u{1F1FF}]{2})\s*(.*)$/u);
  if (flagMatch) {
    linhas.push(`📦 ${flagMatch[1]} *${flagMatch[2].trim()}*`);
  } else {
    linhas.push(`📦 *${(titulo || 'Colecionável Pokémon TCG').trim()}*`);
  }
  linhas.push('');

  // 2. Preços DE / POR
  const de = (precoDe || '').trim();
  const por = (precoPor || '').trim();
  const comCupom = (valorComCupom || '').trim();

  const isPorValido = Boolean(por && por.toLowerCase() !== 'consultar' && por !== '0' && por !== 'R$ 0');
  const isDeValido = Boolean(de && de.toLowerCase() !== 'consultar' && de !== '0' && de !== 'R$ 0' && de !== por);

  if (isDeValido && isPorValido) {
    const valorDe = de.startsWith('R$') ? de : `R$ ${de}`;
    const valorPor = por.startsWith('R$') ? por : `R$ ${por}`;
    linhas.push(`❌ ~De: ${valorDe}~`);
    linhas.push(`👉 *Por apenas: ${valorPor}*`);
  } else if (isPorValido) {
    const valorPor = por.startsWith('R$') ? por : `R$ ${por}`;
    linhas.push(`👉 *Por apenas: ${valorPor}*`);
  }

  // 3. Cupom e Valor com Cupom
  let temCupom = false;
  if (cupom && cupom.trim()) {
    const codCupom = cupom.trim().toUpperCase();
    if (!/^(?:COM\s+CUPOM(?:\s+NO\s+APP)?|CUPOM(?:\s+DE\s+DESCONTO)?|SEM\s+CUPOM)$/i.test(codCupom)) {
      linhas.push(`🎟️ Cupom: *${codCupom}*`);
      temCupom = true;
    }
  }

  if (comCupom && comCupom !== por) {
    const valorFinal = comCupom.startsWith('R$') ? comCupom : `R$ ${comCupom}`;
    linhas.push(`🔥 *Com cupom: ${valorFinal}*`);
    temCupom = true;
  }

  if (isDeValido || isPorValido || temCupom) {
    linhas.push('');
  }

  // 4. Link direto apenas
  linhas.push(`👉 ${linkAfiliado.trim()}`);
  linhas.push('');

  // 5. Rodapé legal
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
 * Extrai valor numérico de strings de moeda brasileira (ex: "R$ 389,90" -> 389.9, "120.00" -> 120, "88" -> 88)
 */
export function parseValorMoeda(valorStr?: string): number {
  if (!valorStr) return 0;
  let limpo = valorStr.replace(/R\$/gi, '').replace(/\s+/g, '').trim();
  if (!limpo) return 0;

  // Se contém vírgula, assume formato brasileiro clássico (pontos = milhares, vírgula = decimal)
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (limpo.includes('.')) {
    // Se não tem vírgula mas tem ponto:
    // Se tem apenas um ponto seguido de 1 ou 2 dígitos decimais (ex: 88.00 ou 88.5), preserva como decimal
    const partes = limpo.split('.');
    if (partes.length === 2 && partes[1].length <= 2) {
      // É decimal no padrão float (ex: 88.00 ou 88.50)
    } else {
      // É separador de milhar (ex: 1.200 ou 1.200.000)
      limpo = limpo.replace(/\./g, '');
    }
  }

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
 * Extrai o código ou condição do cupom mencionado no texto da oferta com alta precisão e resiliência
 */
export function extrairCupom(texto: string): string | null {
  if (!texto) return null;

  const blacklist = new Set([
    'DE', 'NO', 'DO', 'DA', 'EM', 'NA', 'PARA', 'COM', 'SEM', 'POR', 'QUE', 'SEU', 'SUA',
    'DESCONTO', 'APP', 'APLICATIVO', 'MERCADO', 'LIVRE', 'TCG', 'POKEMON', 'NENHUM', 'NOVO',
    'NOVOS', 'VALIDO', 'VALIDOS', 'ATIVO', 'ATIVOS', 'DISPONIVEL', 'DISPONIVEIS', 'LIBERADO',
    'LIBERADOS', 'ESPECIAL', 'HOJE', 'AGORA', 'AQUI', 'TODO', 'TODOS', 'SITE', 'ITEM', 'ITEMS',
    'PRODUTO', 'PRODUTOS', 'CLIENTE', 'PRIMEIRA', 'COMPRA', 'APENAS', 'EXCLUSIVO', 'DIRETO',
    'CARRINHO', 'PAGINA', 'ANUNCIO', 'FINALIZAR', 'PAGAMENTO', 'COMPRANDO', 'USANDO', 'RESGATE',
    'RESGATAR', 'PEGUE', 'ATIVE', 'APLIQUE', 'USE', 'INSIRA', 'COLOQUE', 'DIGITE', 'OFF'
  ]);

  // A) Expressões regulares para encontrar CÓDIGO de cupom alfanumérico
  const regexesCodigo = [
    // cupom (com possíveis adjetivos/local: ativo, válido, exclusivo, liberado, no app, de 10% off, etc.)
    // seguido de separadores como colons, asteriscos, espaços ou hífens e o código
    /cupo(?:m|ns)(?:\s+(?:ativo|v[aá]lido|exclusivo|liberado|especial|novo|do\s+app|no\s+app|no\s+carrinho|direto\s+no\s+app|na\s+p[aá]gina|no\s+an[uú]ncio|de\s+[^\n:]+))?[:\s\*_~=\-]+([a-z0-9_\-]{3,25})/i,
    // (use | usando | com | aplique | aplicar | ative | ativar | insira | inserir | coloque | colocar | digite | digitar | resgate | resgatar) [o] (cupom|código|cod) [:] [*]CODE[*]
    /(?:use|usando|com|aplique|aplicar|ative|ativar|insira|inserir|coloque|colocar|digite|digitar|resgate|resgatar)\s+(?:o\s+)?(?:cupo(?:m|ns)|c[oó]digo|cod)[:\s\*_~=\-]+([a-z0-9_\-]{3,25})/i,
    // (código | cod) [:] CODE
    /(?:c[oó]digo|cod)[:\s\*_~=\-]+([a-z0-9_\-]{3,25})/i,
    // cupom [de] 10% [off] [:] CODE
    /cupo(?:m|ns)(?:\s+de)?\s+\d+%\s*(?:off)?[:\s\*_~=\-]+([a-z0-9_\-]{3,25})/i,
    // cupom [CODE] ou cupom (CODE) ou cupom "CODE"
    /cupo(?:m|ns)[\s:]+[\[\("]([a-z0-9_\-]{3,25})[\]\)"]/i,
    // cupom CODE destacado (ex: Cupom MELIKIDS, Cupom 20OFF)
    /cupo(?:m|ns)\s+([A-Z0-9_\-]{3,25})/,
    // Emojis de cupom (🎟️, 🎫, 🏷️) seguidos de código diretamente ou após 'cupom/código' (ex: 🎟️ MELIUZKIDS)
    /(?:[\u{1F39F}\u{1F3AB}\u{1F3F7}]\u{FE0F}?)\s*(?:(?:cupo(?:m|ns)|c[oó]digo|cod)[:\s\*_~=\-]*)?([a-z0-9_\-]{3,25})/iu
  ];

  for (const regex of regexesCodigo) {
    const match = texto.match(regex);
    if (match && match[1]) {
      const code = match[1].trim().replace(/[\*_~\[\]\(\)\"\']/g, '').toUpperCase();
      // Não pode estar na blacklist, não pode ser apenas números, deve ter pelo menos 3 caracteres e não ser termo genérico
      if (
        !blacklist.has(code) &&
        !/^\d+$/.test(code) &&
        code.length >= 3 &&
        !/^(?:COM|SEM|TEM|CUPOM)$/i.test(code)
      ) {
        return code;
      }
    }
  }

  // B) Fallback inteligente: se não há código textual, mas o post avisa sobre cupom no app ou no anúncio
  // Ex: 'comprando 4 + usando o cupom de 10% no app', 'cupom de R$ 20 no app', 'com cupom no app'
  const descPatterns = [
    /cupo(?:m|ns)\s+de\s+(?:r\$\s*)?(\d+[\d\.,]*%?)\s*(?:off)?(?:\s+(?:no\s+app|direto\s+no\s+app|no\s+an[uú]ncio|na\s+p[aá]gina))?/i,
    /(?:use|usando|com|ative|pegue)\s+(?:o\s+)?cupo(?:m|ns)\s+(?:de\s+)?(?:r\$\s*)?(\d+[\d\.,]*%?)\s*(?:no\s+app|no\s+an[uú]ncio)?/i,
    /cupo(?:m|ns)\s+(?:direto\s+)?no\s+app/i,
    /cupo(?:m|ns)\s+na\s+p[aá]gina(?:\s+do\s+produto)?/i,
    /cupo(?:m|ns)\s+no\s+an[uú]ncio/i
  ];

  for (const regex of descPatterns) {
    const match = texto.match(regex);
    if (match) {
      if (match[1]) {
        const val = match[1].toUpperCase();
        const tag = /%/.test(val) ? `${val} OFF NO APP` : `R$ ${val.replace(/^R\$\s*/i, '')} NO APP`;
        return `${tag} (Ative na página do produto)`;
      }
      if (/an[uú]ncio|p[aá]gina/i.test(match[0])) {
        return 'DISPONÍVEL NO ANÚNCIO (Ative na página do produto)';
      }
      return 'DISPONÍVEL NO APP (Ative no app do Mercado Livre)';
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

/**
 * Extrai preço unitário de combos/múltiplos (ex: "(APENAS 11,90 CADA)", "Apenas R$ 11,90 cada", "11,90 cada", "(11,90 a unidade)")
 */
export function extrairPrecoUnitario(texto: string): string | null {
  if (!texto) return null;

  const padroes = [
    // (APENAS 11,90 CADA) ou (Apenas R$ 11,90 cada) ou (11,90 cd) ou (sai a 11,90 cada)
    /\(?\s*(?:apenas|saindo a|sai a|sai por)?\s*R?\$?\s*(\d+(?:[.,]\d+)*)\s*(?:cada|cd|a\s+unid(?:ade)?|por\s+unid(?:ade)?|a\s+und|por\s+und)\b\)?/i,
    // (apenas 11,90 unidade)
    /\(\s*(?:apenas\s*)?R?\$?\s*(\d+(?:[.,]\d+)*)\s*(?:cada|cd|unidade)\s*\)/i,
    // cada por R$ 11,90
    /\b(?:cada|unidade)\s*(?:por|sai a|a)?\s*R?\$?\s*(\d+(?:[.,]\d+)*)/i
  ];

  for (const regex of padroes) {
    const match = texto.match(regex);
    if (match && match[1]) {
      let valor = match[1].trim().replace(/\.$/, '').replace(/,$/, '');
      if (!valor.includes(',') && !valor.includes('.')) {
        valor = `${valor},00`;
      } else if (/\.\d{1}$/.test(valor) || /,\d{1}$/.test(valor)) {
        valor = `${valor}0`;
      }
      if (!valor.startsWith('R$')) {
        valor = `R$ ${valor}`;
      }
      return valor;
    }
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
  precoUnitario?: string;
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
  const { tipo, titulo, precoDe, precoPor, precoUnitario, parcelamento, cupom, detalhesCupom, linkAfiliado, linkVitrineCurto, textoOriginalHigienizado } = params;
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
  // Preço "De" SÓ pode ser incluído se for comprovadamente maior que o preço "Por" (desconto real)
  if (isDeValido && calculo) {
    const valorDe = de.startsWith('R$') ? de : `R$ ${de}`;
    linhaPrecoDe = `❌ ~De: ${valorDe}~`;
  }

  let linhaPrecoPor = '';
  if (isPorValido) {
    const valorPor = por.startsWith('R$') ? por : `R$ ${por}`;
    linhaPrecoPor = `🔥 *Por apenas: ${valorPor}*${tagDesconto}`;
  }

  let linhaPrecoUnitario = '';
  if (precoUnitario && precoUnitario.trim()) {
    const valUnit = precoUnitario.trim().startsWith('R$') ? precoUnitario.trim() : `R$ ${precoUnitario.trim()}`;
    linhaPrecoUnitario = `🏷️ *(Apenas ${valUnit} cada)*`;
  }

  let linhaParcelamento = '';
  if (parcelamento && parcelamento.trim() && /sem\s+juros|s\/\s*juros/i.test(parcelamento)) {
    linhaParcelamento = parcelamento.trim();
  }

  let linhaCupom = '';
  if (cupom && cupom.trim()) {
    const limpo = cupom.trim();
    if (!/^(?:com\s+cupom(?:\s+no\s+app)?|cupom(?:\s+de\s+desconto)?|sem\s+cupom)$/i.test(limpo)) {
      if (/^[a-z0-9_\-]+$/i.test(limpo)) {
        linhaCupom = `🎟️ Cupom: *${limpo.toUpperCase()}*`;
      } else {
        linhaCupom = `🎟️ Cupom: *${limpo}*`;
      }
    }
  }

  // Preservação e destaque visual de bandeira do país (ex: 🇺🇸, 🇯🇵, 🇧🇷)
  const flagMatch = titulo.match(/^([\u{1F1E6}-\u{1F1FF}]{2})\s*(.*)$/u);
  const linhaProduto = flagMatch
    ? `📦 ${flagMatch[1]} *${flagMatch[2].trim()}*`
    : `📦 *${titulo.trim()}*`;

  // Template 2: Alerta de Urgência & Escassez
  if (tipo === 'urgencia') {
    const linhas: string[] = [
      '@pokemon_tcg_promo',
      '',
      '🚨 *ATENÇÃO: ÚLTIMAS UNIDADES EM ESTOQUE!* 🚨',
      '',
      linhaProduto,
      ''
    ];

    if (linhaPrecoDe) linhas.push(linhaPrecoDe);
    if (linhaPrecoPor) linhas.push(linhaPrecoPor);
    if (linhaPrecoUnitario) linhas.push(linhaPrecoUnitario);
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
    linhaProduto,
    ''
  ];

  if (linhaPrecoDe) linhas.push(linhaPrecoDe);
  if (linhaPrecoPor) linhas.push(linhaPrecoPor);
  if (linhaPrecoUnitario) linhas.push(linhaPrecoUnitario);
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
    const { resolvedUrl, productImageUrl, rawHtml } = await expandUrl(
      rawUrl,
      'Pokemon TCG',
      config.meliCookie || ''
    );

    const targetUrl = resolvedUrl || rawUrl;
    let htmlConteudo = rawHtml || '';

    // 2. Extrair slug e título inicial
    let slug = '';
    const slugMatch = targetUrl.match(/mercadolivre\.com\.br\/([^\s"'<>]+?)\/(?:p\/|up\/|MLB-)/i);
    if (slugMatch) {
      slug = slugMatch[1];
    } else {
      try {
        const u = new URL(targetUrl);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          slug = parts[0];
        }
      } catch {}
    }

    let titulo = formatarTituloPorSlug(slug);

    // 3. Obter a foto oficial em alta resolução (2X) e inspecionar HTML direto se necessário
    let imageUrl: string | null = productImageUrl ? normalizarFotoMl(productImageUrl) : null;

    if ((!htmlConteudo || !imageUrl) && targetUrl && !targetUrl.includes('/social/')) {
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
          htmlConteudo = await res.text();
        }
      } catch (err) {
        console.warn('[Anúncio Extrator] Falha ao inspecionar página:', err);
      }
    }

    // Extrair detalhes estruturados do HTML (Preço De, Por, Cupom, Parcelamento, Título)
    const detalhes = extrairDetalhesPrecoECupom(htmlConteudo, slug);

    if (detalhes.titulo && detalhes.titulo.length > 5) {
      titulo = detalhes.titulo;
    } else if (htmlConteudo) {
      const ogTitle = htmlConteudo.match(
        /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i
      );
      if (ogTitle && ogTitle[1]) {
        const parsedTitle = ogTitle[1].replace(/\s*\|\s*Mercado\s*Livre.*$/i, '').trim();
        if (parsedTitle && parsedTitle.length > 5 && !/minhas listas|recomenda[çc][õo]es|vitrine|perfil/i.test(parsedTitle)) {
          titulo = parsedTitle;
        }
      }
    }

    if (!imageUrl && htmlConteudo) {
      const ogImg = htmlConteudo.match(
        /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i
      );
      const ogClean = ogImg && ogImg[1] ? ogImg[1].replace(/\{sanitized_title\}/gi, '').trim() : '';
      if (ogClean && isImagemValidaProdutoMl(ogClean)) {
        imageUrl = normalizarFotoMl(ogClean);
      } else {
        const mlImgs = htmlConteudo.match(
          /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/gi
        );
        if (mlImgs && mlImgs.length > 0) {
          const validImgs = mlImgs.filter(isImagemValidaProdutoMl);
          if (validImgs.length > 0) {
            imageUrl = normalizarFotoMl(validImgs[0]);
          }
        }
      }
    }

    // 4. Determinar o Link de Afiliado Final:
    let linkAfiliadoFinal = rawUrl;
    const isAlreadyShortAffiliate =
      /mercadolivre\.com\/sec\//i.test(rawUrl) || /meli\.la\//i.test(rawUrl);

    if (!isAlreadyShortAffiliate) {
      const affiliateLongUrl = buildAffiliateUrl(
        targetUrl,
        config.mattWord,
        config.mattTool
      );

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

    // 5. Preços e Cupons Finais (Prioriza o digitado manualmente pelo usuário, fallback para extração automática)
    const rawPrecoDe = (input.precoDe || '').trim() || detalhes.precoDe || undefined;
    const precoPorFinal = (input.precoPor || '').trim() || detalhes.precoPor || undefined;
    const precoDeFinal = (rawPrecoDe && precoPorFinal && rawPrecoDe === precoPorFinal) ? undefined : rawPrecoDe;

    let cupomFinal = (input.cupom || '').trim() || detalhes.cupom || undefined;
    if (cupomFinal && /^(?:com\s+cupom(?:\s+no\s+app)?|cupom(?:\s+de\s+desconto)?|sem\s+cupom)$/i.test(cupomFinal.trim())) {
      cupomFinal = undefined;
    }

    const valorComCupomFinal = (input.valorComCupom || '').trim() || detalhes.valorComCupom || undefined;

    let parcelamentoFinal = (input.parcelamento || '').trim() || detalhes.parcelamento || undefined;
    if (parcelamentoFinal && !/sem\s+juros|s\/\s*juros/i.test(parcelamentoFinal)) {
      parcelamentoFinal = undefined;
    }

    // 6. Montar a Copy
    const textoGerado = gerarCopyPromocional({
      titulo,
      linkAfiliado: linkAfiliadoFinal,
      cupom: cupomFinal,
      precoDe: precoDeFinal,
      precoPor: precoPorFinal,
      valorComCupom: valorComCupomFinal,
      parcelamento: parcelamentoFinal
    });

    return {
      ok: true,
      titulo,
      imageUrl,
      textoGerado,
      linkAfiliado: linkAfiliadoFinal,
      resolvedUrl: targetUrl,
      precoDe: precoDeFinal,
      precoPor: precoPorFinal,
      cupom: cupomFinal,
      valorComCupom: valorComCupomFinal,
      parcelamento: parcelamentoFinal
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
