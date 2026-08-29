// Replica WhatsApp Conectar -> node "Montar Pagina do QR"
// Transforma a resposta de GET /instance/connect/<instancia> em uma pagina simples.
// A pagina se recarrega sozinha porque o QR do WhatsApp expira em poucos segundos.
const r = $input.first().json || {};

const estado = (r.instance && r.instance.state) || r.state || '';
const imagem = r.base64 || (r.qrcode && r.qrcode.base64) || '';
const codigo = r.pairingCode || (r.qrcode && r.qrcode.pairingCode) || '';
const conectado = estado === 'open';

const partes = [];
partes.push('<!DOCTYPE html>');
partes.push("<html lang='pt-BR'><head><meta charset='utf-8'>");
partes.push("<meta name='viewport' content='width=device-width, initial-scale=1'>");
if (!conectado) {
  partes.push("<meta http-equiv='refresh' content='25'>");
}
partes.push('<title>Conectar WhatsApp</title>');
partes.push("<script src='https://cdn.tailwindcss.com'></script></head>");
partes.push("<body class='bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6'>");
partes.push("<div class='max-w-md w-full bg-slate-900 rounded-2xl p-6 space-y-4 text-center'>");
partes.push("<h1 class='text-xl font-semibold'>Conectar o WhatsApp</h1>");

if (conectado) {
  partes.push("<p class='text-emerald-400'>Ja esta conectado. Pode fechar esta pagina.</p>");
} else if (imagem) {
  partes.push("<p class='text-sm text-slate-400'>No celular: WhatsApp, Aparelhos conectados, Conectar aparelho. Aponte a camera para o codigo.</p>");
  partes.push("<img alt='QR code' class='mx-auto rounded-xl bg-white p-2' src='" + imagem + "'>");
  if (codigo) {
    partes.push("<p class='text-xs text-slate-400'>Codigo para digitar no lugar do QR: " + codigo + "</p>");
  }
  partes.push("<p class='text-xs text-slate-500'>A pagina se atualiza a cada 25 segundos, porque o codigo expira rapido.</p>");
} else {
  partes.push("<p class='text-amber-400'>A Evolution nao devolveu codigo agora. Recarregue em alguns segundos.</p>");
  partes.push("<pre class='text-left text-xs text-slate-500 overflow-auto'>" + JSON.stringify(r).slice(0, 400) + "</pre>");
}

partes.push('</div></body></html>');

return [{ json: { html: partes.join(String.fromCharCode(10)) } }];
