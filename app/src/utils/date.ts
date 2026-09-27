/**
 * Utilitários Canônicos de Data e Fuso Horário Brasileiro (America/Sao_Paulo - UTC-3)
 * Evita discrepâncias onde toISOString() avança para o dia seguinte a partir das 21h em Brasília.
 */

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

const brazilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRAZIL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/**
 * Retorna a data no formato YYYY-MM-DD no fuso horário oficial do Brasil.
 */
export function getBrazilDateStr(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return brazilDateFormatter.format(new Date());
  }
  return brazilDateFormatter.format(d);
}

/**
 * Retorna a data de hoje (YYYY-MM-DD) no fuso do Brasil.
 */
export function getBrazilToday(): string {
  return brazilDateFormatter.format(new Date());
}

/**
 * Retorna a data de N dias atrás (YYYY-MM-DD) no fuso do Brasil.
 */
export function getBrazilDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return brazilDateFormatter.format(d);
}

/**
 * Normaliza qualquer formato de data (DD/MM/YYYY, YYYY-MM-DD, ISO com hora) para YYYY-MM-DD.
 */
export function normalizeDateToIsoDay(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();

  // Padrão DD/MM/YYYY ou DD/MM/YY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Padrão YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Fallback para Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return getBrazilDateStr(parsed);
  }

  return trimmed;
}
