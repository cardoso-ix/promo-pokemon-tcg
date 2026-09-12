/**
 * Processa expressões Spintax no formato {opcao1|opcao2|opcao3}
 * Suporta aninhamento recursivo
 */
export function parseSpintax(text: string): string {
  if (!text) return '';

  // Só trata como Spintax se houver separador de opções (|)
  const spintaxRegex = /\{([^{}]+?\|[^{}]+?)\}/;
  let matches;

  let result = text;
  while ((matches = spintaxRegex.exec(result)) !== null) {
    const options = matches[1].split('|');
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.replace(matches[0], chosen);
  }

  return result;
}

/**
 * Retorna saudação dinâmica baseada no horário atual
 */
export function getSaudacaoHorario(): string {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Renderiza uma mensagem completa combinando Spintax e tags dinâmicas
 */
export function renderMessageTemplate(
  template: string,
  contato: { nome?: string; numero: string; grupo_nome?: string }
): string {
  let rendered = parseSpintax(template);

  // Extrair primeiro nome ou fallback
  let primeiroNome = (contato.nome || '').trim().split(' ')[0] || '';
  if (!primeiroNome || /^[0-9+]+$/.test(primeiroNome)) {
    primeiroNome = 'amigo';
  }

  const saudacao = getSaudacaoHorario();
  const grupoNome = contato.grupo_nome || 'Pokémon TCG';

  rendered = rendered.replace(/\{nome\}/gi, primeiroNome);
  rendered = rendered.replace(/\{saudacao\}/gi, saudacao);
  rendered = rendered.replace(/\{numero\}/gi, contato.numero);
  rendered = rendered.replace(/\{grupo\}/gi, grupoNome);

  return rendered.trim();
}
