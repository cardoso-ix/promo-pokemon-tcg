/**
 * Módulo de Inteligência de Preços e Sanidade Pokémon TCG
 * Protege contra distorções causadas por anúncios com estoque esgotado,
 * erros de parsing e redirecionamentos para vitrines e carrosséis de recomendações.
 */

export interface PrecoSaneadoResult {
  precoPor: number;
  precoDe: number | null;
  valido: boolean;
  esgotadoAjustado?: boolean;
}

/**
 * Detecta se a página do anúncio do Mercado Livre está pausada, esgotada ou sem estoque
 */
export function isAnuncioEsgotadoOuPausado(html: string, url?: string): boolean {
  if (url && (url.includes('/sec/') || url.includes('/social/'))) {
    return true;
  }
  if (!html) return false;

  const h = html.toLowerCase();
  if (
    h.includes('"status":"paused"') ||
    h.includes('"item_status":"paused"') ||
    h.includes('"status":"closed"') ||
    h.includes('"status":"under_review"')
  ) {
    return true;
  }
  if (
    h.includes('anúncio pausado') ||
    h.includes('anuncio pausado') ||
    h.includes('o vendedor pausou este anúncio') ||
    h.includes('o vendedor pausou este anuncio') ||
    h.includes('o anúncio foi finalizado') ||
    h.includes('o anuncio foi finalizado')
  ) {
    return true;
  }
  if (
    h.includes('não há estoque') ||
    h.includes('nao ha estoque') ||
    h.includes('estoque esgotado') ||
    h.includes('produto esgotado') ||
    h.includes('sem estoque disponível') ||
    h.includes('este produto não está mais disponível') ||
    h.includes('este produto nao esta mais disponivel')
  ) {
    return true;
  }
  if (h.includes('ui-pdp-buybox--disabled') || h.includes('ui-pdp-promotions-pillar-header__title')) {
    return true;
  }
  return false;
}

/**
 * Retorna o piso mínimo de mercado para um produto Pokémon TCG.
 * Produtos legítimos de Pokémon TCG Copag lacrados nunca custam valores irrisórios de parsing.
 */
export function obterPrecoMinimoCategoriaTCG(titulo: string): number {
  const t = String(titulo || '').toLowerCase();
  if (t.includes('display') || t.includes('booster box') || t.includes('360')) return 140.0;
  if (t.includes('etb') || t.includes('elite trainer') || t.includes('treinador avançado')) return 160.0;
  if (t.includes('poster')) return 60.0;
  if (t.includes('bundle') || t.includes('fichario') || t.includes('fichário') || t.includes('album') || t.includes('álbum')) return 45.0;
  if (t.includes('box') || t.includes('coleção') || t.includes('colecao') || t.includes('charizard') || t.includes('zeraora') || t.includes('zygarde') || t.includes('lucario')) return 50.0;
  if (t.includes('blister quadruplo') || t.includes('quádruplo') || t.includes('4 boosters')) return 35.0;
  if (t.includes('blister triplo') || t.includes('3 boosters')) return 25.0;
  if (t.includes('blister') || t.includes('booster')) return 8.0;
  return 15.0;
}

/**
 * Calibra e saneia preços de produtos Pokémon TCG contra erros de parsing e valores truncados
 * (ex: "30 anos" virando R$ 30, "8 boosters" virando R$ 8, produtos esgotados herdando R$ 8 de recomendações).
 */
export function sanearPrecoHistoricoTCG(
  titulo: string,
  precoPor: number,
  precoDe?: number | null
): PrecoSaneadoResult {
  const t = String(titulo || '').toLowerCase();
  let por = Number(precoPor) || 0;
  let de = precoDe ? Number(precoDe) : null;
  let esgotadoAjustado = false;

  // 1. Caso de Fichário & Álbum (ex: Fichário 30 Anos para 360 cartas)
  if ((t.includes('fichario') || t.includes('fichário') || t.includes('album') || t.includes('álbum') || t.includes('pasta')) && por <= 50) {
    por = 149.90;
    de = 179.90;
    esgotadoAjustado = true;
  }
  // 2. Caso de Display / Booster Box (se contiver display, booster box ou 360 que não seja álbum/cartas)
  else if ((t.includes('display') || t.includes('booster box') || (t.includes('360') && !t.includes('cartas'))) && por <= 120) {
    por = 279.00;
    de = 339.00;
    esgotadoAjustado = true;
  }
  // 3. Caso de ETB / Elite Trainer Box com preço <= 150
  else if ((t.includes('etb') || t.includes('elite trainer') || t.includes('treinador avançado') || t.includes('treinador avancado')) && por <= 150) {
    por = 349.90;
    de = 399.90;
    esgotadoAjustado = true;
  }
  // 4. Caso explícito: "30 anos por 30 reais" (ou <= 45) - Poster Box e Coleção Especial 30 Anos
  else if ((t.includes('30 anos') || t.includes('30ano') || (t.includes('30') && (t.includes('coleção') || t.includes('colecao') || t.includes('poster')))) && por <= 45) {
    por = 189.90;
    de = 229.90;
    esgotadoAjustado = true;
  }
  // 5. Caso de Boxes Especiais com "8 boosters", "6 boosters" ou preços truncados <= 45 (ex: Box Zeraora por R$ 8)
  else if ((t.includes('box') || t.includes('zeraora') || t.includes('lucario') || t.includes('zygarde') || t.includes('charizard')) && por <= 45) {
    if (t.includes('zeraora')) {
      por = 139.90;
      de = 169.90;
    } else if (t.includes('lucario')) {
      por = 129.90;
      de = 159.90;
    } else if (t.includes('zygarde')) {
      por = 119.90;
      de = 149.90;
    } else if (t.includes('charizard')) {
      por = 169.90;
      de = 219.90;
    } else {
      por = 139.90;
      de = 169.90;
    }
    esgotadoAjustado = true;
  }
  // 6. Caso de Booster Bundle com preço <= 45
  else if (t.includes('bundle') && por <= 45) {
    por = 89.90;
    de = 109.90;
    esgotadoAjustado = true;
  }
  // 7. Caso de Blister Quádruplo com preço <= 25 (ex: "4 boosters" virando R$ 4)
  else if ((t.includes('quadruplo') || t.includes('quádruplo') || t.includes('4 booster') || t.includes('4 pacot')) && por <= 25) {
    por = 49.90;
    de = 59.90;
    esgotadoAjustado = true;
  }
  // 8. Caso de Blister Triplo com preço <= 20 (ex: "3 boosters" virando R$ 3)
  else if ((t.includes('triplo') || t.includes('3 booster') || t.includes('3 pacot')) && por <= 20) {
    por = 39.90;
    de = 47.90;
    esgotadoAjustado = true;
  }

  // 9. Piso de Sanidade Geral: nenhum produto Pokémon TCG oficial lacrado custa menos de R$ 12,00
  if (por < 12.0) {
    return { precoPor: por, precoDe: de, valido: false, esgotadoAjustado };
  }

  // 10. Se precoDe for menor ou igual a precoPor, anula precoDe
  if (de !== null && de <= por) {
    de = null;
  }

  return { precoPor: por, precoDe: de, valido: true, esgotadoAjustado };
}
