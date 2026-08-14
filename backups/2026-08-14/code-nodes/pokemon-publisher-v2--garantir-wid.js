const items = $input.all();
const out = [];
for (const it of items) {
  const d = Object.assign({}, it.json);
  const id = String(d.item_id || '');
  let u = String(d.utm_link || '').trim();
  if (id && u && u.indexOf('wid=') < 0) {
    u = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'wid=' + encodeURIComponent(id);
  }
  d.utm_link = u;
  const base = String(d.permalink || '').split('#')[0].split('?')[0];
  d.url_reconferir = base ? (base + (id ? ('?wid=' + encodeURIComponent(id)) : '')) : u;
  out.push({ json: d });
}
return out;