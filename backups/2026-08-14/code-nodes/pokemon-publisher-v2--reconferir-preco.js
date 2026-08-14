const base = $('Garantir Wid').first().json;
const d = Object.assign({}, base);
const html = String(($json && ($json.body != null ? $json.body : ($json.data != null ? $json.data : ''))) || '');
const itemId = String(d.item_id || '');
function precoDoHtml(s, id) {
  if (!s || s.length < 800) return null;
  if (/suspicious-traffic|security\.js|challenge/i.test(s)) return null;
  const idx = id ? s.indexOf(id) : -1;
  const fatia = idx >= 0 ? s.slice(Math.max(0, idx - 800), idx + 12000) : s;
  const re = /"current_price"\s*:\s*\{\s*"value"\s*:\s*([0-9]+(?:\.[0-9]+)?)/;
  const m = fatia.match(re) || s.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return (!isNaN(n) && n > 0) ? n : null;
}
const visto = precoDoHtml(html, itemId);
d.preco_reconferido = visto;
d.preco_ok = true;
d.publicavel = true;
if (visto != null) {
  const novo = Math.round(visto * 100);
  const velho = Number(d.price_cents || 0);
  if (velho > 0 && (novo - velho) > 100) {
    d.preco_ok = false;
    d.publicavel = false;
    d.etapa = 'preco';
    d.motivo = 'preco na pagina com wid (R$ ' + visto.toFixed(2) + ') diverge do polycard (R$ ' + (velho / 100).toFixed(2) + ')';
  } else if (velho > 0 && (velho - novo) > 100) {
    const orig = Number(d.original_price_cents || 0);
    d.price_cents = novo;
    if (orig > novo) d.discount_pct = Math.round(((orig - novo) / orig) * 10000) / 100;
  }
}
return [{ json: d }];