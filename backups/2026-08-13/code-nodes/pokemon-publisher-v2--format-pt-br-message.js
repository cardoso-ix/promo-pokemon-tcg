// Pokemon Publisher v2 > node "Format PT-BR Message"
// Backup de 13/08/2026. Nao e executado daqui: a fonte de verdade e o n8n.

const items = $input.all();
const out = [];
// Escape de HTML e obrigatorio: com parse_mode=HTML um & ou < vindo do titulo
// ou do cupom quebra o post com erro 400 do Telegram.
const escHtml = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const brl = (cents) => (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
const int = (n) => { try { return Number(n).toLocaleString('pt-BR'); } catch (e) { return String(n); } };

// ===== TRAVAS DE PUBLICACAO =====
// Regra do Eduardo, 13/08/2026: so publica item que tenha (1) link de afiliado
// reconhecivel e (2) foto valida. NAO existe fallback para permalink: entregar
// trafego sem comissao e pior do que nao publicar. E item sem foto quebra o
// sendPhoto do Telegram e trava a fila para sempre (troubleshooting P8).
// Item reprovado sai com publicavel = false e a etapa que barrou; o ramo falso
// do IF grava o motivo em promos_erros.
const AFILIADO_APELIDO = 'caed1312314';
const AFILIADO_TOOL_ID = '96097202';
function temAfiliado(u) {
  const s = String(u == null ? '' : u);
  return s.indexOf('matt_word=' + AFILIADO_APELIDO) >= 0 && s.indexOf('matt_tool=' + AFILIADO_TOOL_ID) >= 0;
}
function temFoto(u) {
  return /^https?:\/\//i.test(String(u == null ? '' : u).trim());
}

// Idioma da carta: informacao que o colecionador valoriza. O Scanner grava o
// codigo e a confianca da deteccao em promos. So exibimos com confianca >= 0.85;
// 'ambiguo' (dois idiomas no titulo) e 'desconhecido' ficam de fora, porque
// errar o idioma de uma carta e pior do que nao falar nada.
// Se o banco vier vazio (titulo sem "Portugues"/"Ingles"), o Publisher tenta de
// novo no momento do post: "Ing" no fim, nome de produto BR/EN, loja Copag/Pokemon.
const IDIOMA_LABEL = { pt: 'Portugu\u00eas', en: 'Ingl\u00eas', ja: 'Japon\u00eas', ko: 'Coreano', zh: 'Chin\u00eas' };
const IDIOMA_CONF_MIN = 0.85;
const BS = String.fromCharCode(92);
const RE_ACENTO = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
const RE_LIXO = new RegExp('[^a-z0-9/ -]', 'g');
const RE_ESPACOS = new RegExp(' +', 'g');
function bord(fonte) { return new RegExp(fonte.split('~').join(BS + 'b'), 'i'); }
function semAcento(s) { return String(s == null ? '' : s).normalize('NFD').replace(RE_ACENTO, ''); }
function norm(t) { return semAcento(t).toLowerCase().replace(RE_LIXO, ' ').replace(RE_ESPACOS, ' ').trim(); }
const REGRAS_IDIOMA = [
  ['ja', bord('(japones|japonesa|japonesas|japoneses|japanese|~japan~)')],
  ['en', bord('(ingles|inglesa|~english~|~eng~|~ing~)')],
  ['pt', bord('(portugues|portuguesa|~nacional~|~ptbr~|~pt-br~|~pt br~|~copag~)')],
  ['ko', bord('(coreano|coreana|korean)')],
  ['zh', bord('(chines|chinesa|chinese)')]
];
const SINAIS_PT_PRODUTO = bord('(treinador avancado|deck de batalha|baralho de batalha|mega evolucao)');
const SINAIS_EN_PRODUTO = bord('(elite trainer box|~etb~|battle deck|mega evolution|pitch black)');
function detectarIdioma(titulo, searchTerm) {
  const n = norm(titulo);
  const achados = [];
  for (const regra of REGRAS_IDIOMA) {
    if (regra[1].test(n) && achados.indexOf(regra[0]) < 0) achados.push(regra[0]);
  }
  if (achados.length > 1) return { idioma: 'ambiguo', confianca: 0.4, candidatos: achados.slice().sort() };
  if (achados.length === 1) {
    const ultima = n.split(' ').pop() || '';
    let re = null;
    for (const regra of REGRAS_IDIOMA) if (regra[0] === achados[0]) re = regra[1];
    return { idioma: achados[0], confianca: re.test(ultima) ? 0.97 : 0.85 };
  }
  const temPt = SINAIS_PT_PRODUTO.test(n);
  const temEn = SINAIS_EN_PRODUTO.test(n);
  if (temPt && temEn) return { idioma: 'ambiguo', confianca: 0.4, candidatos: ['en', 'pt'] };
  if (temEn) return { idioma: 'en', confianca: 0.85 };
  if (temPt) return { idioma: 'pt', confianca: 0.85 };
  const loja = String(searchTerm || '').toLowerCase();
  if (loja === 'loja:copag' || loja === 'loja:pokemon') return { idioma: 'pt', confianca: 0.85 };
  return { idioma: 'desconhecido', confianca: 0 };
}

for (const item of items) {
  const d = item.json;
  if (!d || !d.item_id) continue;

  // As travas vem antes de qualquer formatacao: item reprovado nem chega a virar post.
  const buyLink = String(d.utm_link == null ? '' : d.utm_link).trim();
  if (!temAfiliado(buyLink)) {
    out.push({ json: {
      publicavel: false,
      etapa: 'afiliado',
      id: d.id,
      item_id: d.item_id,
      motivo: buyLink ? 'utm_link presente mas sem os parametros de afiliado' : 'utm_link vazio',
      valor_visto: buyLink.slice(0, 200)
    } });
    continue;
  }

  const foto = String(d.thumbnail == null ? '' : d.thumbnail).trim();
  if (!temFoto(foto)) {
    out.push({ json: {
      publicavel: false,
      etapa: 'foto',
      id: d.id,
      item_id: d.item_id,
      motivo: foto ? 'thumbnail nao e uma URL http' : 'thumbnail vazio',
      valor_visto: foto.slice(0, 200)
    } });
    continue;
  }

  const priceCents = Number(d.price_cents || 0);
  const origCents = d.original_price_cents ? Number(d.original_price_cents) : 0;
  const discNum = d.discount_pct ? parseFloat(d.discount_pct) : 0;
  const hasDisc = origCents > priceCents && discNum > 0;
  const savedCents = hasDisc ? origCents - priceCents : 0;
  const superOferta = hasDisc && discNum > 40;

  const cupomCod = d.cupom_codigo ? String(d.cupom_codigo).trim() : '';
  const cupomDesc = d.cupom_descricao ? String(d.cupom_descricao).trim() : '';
  const cupomMin = d.cupom_valor_minimo_cents ? Number(d.cupom_valor_minimo_cents) : 0;
  const cupomAte = d.cupom_valido_ate_br ? String(d.cupom_valido_ate_br).trim() : '';

  const rep = d.seller_reputation ? parseFloat(d.seller_reputation) : 0;
  const sales = d.seller_sales ? Number(d.seller_sales) : 0;

  let idiomaCod = d.idioma ? String(d.idioma) : '';
  let idiomaConf = d.idioma_confianca == null ? 0 : parseFloat(d.idioma_confianca);
  if (!IDIOMA_LABEL[idiomaCod] || isNaN(idiomaConf) || idiomaConf < IDIOMA_CONF_MIN) {
    const idi = detectarIdioma(d.title, d.search_term);
    idiomaCod = idi.idioma;
    idiomaConf = idi.confianca;
  }
  const idiomaLabel = (!isNaN(idiomaConf) && idiomaConf >= IDIOMA_CONF_MIN && IDIOMA_LABEL[idiomaCod]) ? IDIOMA_LABEL[idiomaCod] : '';

  const build = (t) => {
    const L = [];
    if (superOferta) {
      L.push('<b>SUPER OFERTA</b>  \u00b7  <b>' + discNum.toFixed(0) + '% OFF</b>');
    } else {
      L.push('<b>Pok\u00e9mon TCG</b>');
    }
    L.push('');
    L.push('<b>' + escHtml(t) + '</b>');
    L.push('');
    if (hasDisc) {
      L.push('De <s>R$ ' + brl(origCents) + '</s>  \u2192  <b>R$ ' + brl(priceCents) + '</b>');
      if (superOferta) {
        L.push('Voc\u00ea economiza <b>R$ ' + brl(savedCents) + '</b>');
      } else {
        L.push('<b>' + discNum.toFixed(0) + '% OFF</b>  \u00b7  voc\u00ea economiza R$ ' + brl(savedCents));
      }
    } else {
      L.push('<b>R$ ' + brl(priceCents) + '</b>');
    }
    if (idiomaLabel) {
      L.push('Idioma: <b>' + escHtml(idiomaLabel) + '</b>');
    }
    if (cupomDesc) {
      L.push('');
      if (cupomCod) L.push('Cupom  <code>' + escHtml(cupomCod) + '</code>');
      const extra = [];
      extra.push(escHtml(cupomDesc));
      if (cupomMin > 0) extra.push('m\u00ednimo R$ ' + brl(cupomMin));
      if (cupomAte) extra.push('at\u00e9 ' + escHtml(cupomAte));
      L.push(extra.join('  \u00b7  '));
    }
    const tr = [];
    if (rep > 0) tr.push('nota ' + rep.toFixed(1) + '/5');
    if (sales > 0) tr.push('+' + int(sales) + ' vendas');
    // Reputacao neutra (3.0 / 0 vendas) e o default de quando o parser nao acha o dado:
    // mostrar isso passaria desconfianca, entao a linha some.
    if (tr.length && !(rep <= 3 && sales === 0)) {
      L.push('');
      L.push('Vendedor: ' + tr.join(' \u00b7 '));
    }
    L.push('');
    L.push('\u23f3 Pre\u00e7o e estoque podem mudar');
    return L.join('\n');
  };

  let title = String(d.title || '').trim();
  let caption = build(title);
  // Limite de 1024 do caption: encurta o titulo e remonta, para nunca cortar no meio de uma tag
  if (caption.length > 1024) {
    const over = caption.length - 1024 + 3;
    title = title.slice(0, Math.max(20, title.length - over)) + '...';
    caption = build(title);
  }

  out.push({ json: { publicavel: true, etapa: 'ok', id: d.id, item_id: d.item_id, caption: caption, thumbnail: foto, buy_link: buyLink, has_cupom: cupomDesc ? true : false, idioma: idiomaCod, idioma_exibido: idiomaLabel, super_oferta: superOferta } });
}
// Retorna vazio quando nao ha nada a publicar: os nodes seguintes nao executam
return out;
