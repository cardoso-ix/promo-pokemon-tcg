const items = $input.all();
const out = [];
for (const it of items) {
  const d = Object.assign({}, it.json);
  if (d.decisao === 'aceito') {
    const id = String(d.item_id || '');
    let u = String(d.utm_link || '');
    if (id && u && u.indexOf('wid=') < 0) {
      u = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'wid=' + encodeURIComponent(id);
      d.utm_link = u;
      d.utm_link_bruto = u;
    }
    if (!d.loja_slug && d.slug) d.loja_slug = String(d.slug);
  }
  out.push({ json: d });
}
return out;
