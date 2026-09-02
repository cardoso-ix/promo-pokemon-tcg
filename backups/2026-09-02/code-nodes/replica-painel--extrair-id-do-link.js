const item = $input.first().json || {};
const q = item.query || {};
const p = item.params || {};
const body = item.body || {};
let id = String(q.id || p.id || body.id || '').trim();
if (!id) {
  const url = String(item.webhookUrl || '');
  const m = /\/(?:replica\/s\/|s\/)([A-Za-z0-9_-]{4,16})(?:\?|#|$)/i.exec(url);
  if (m) id = m[1];
}
id = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16);
return [{ json: { id: id } }];