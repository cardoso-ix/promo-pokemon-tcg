// Replica Painel -> node "Montar Pagina"
const entrada = ($input.last() || $input.first() || { json: {} }).json;
const dados = entrada.painel || {};
let tokenSave = "a71e4f516c59fea873e4b07b92e8f26008f215a2dd406f30";
try {
  if (typeof $env !== "undefined" && $env.REPLICA_PAINEL_SAVE_TOKEN) {
    const v = String($env.REPLICA_PAINEL_SAVE_TOKEN).trim();
    if (v) tokenSave = v;
  }
} catch (e) {}
dados.save_token = tokenSave;
if (dados.config) {
  delete dados.config.save_token;
}
const paginaGz = dados.pagina_gz || "";
delete dados.pagina_gz;
let PAGINA = "<!DOCTYPE html><html lang=pt-BR><body style=background:#09090b;color:#f3efe6;font-family:sans-serif;padding:2rem>Painel em atualizacao. Recarregue com Ctrl+F5.</body></html>";
let erroGz = "";
try {
  if (paginaGz) {
    PAGINA = Buffer.from(paginaGz, "base64").toString("utf8");
    if (PAGINA.indexOf("__DADOS__") < 0) erroGz = "HTML sem marcador";
  } else {
    erroGz = "pagina_gz vazio";
  }
} catch (e) {
  erroGz = String(e && e.message ? e.message : e);
}
const codificado = Buffer.from(JSON.stringify(dados)).toString("base64");
return [{ json: { html: PAGINA.replace("__DADOS__", codificado), erroGz: erroGz, gzLen: String(paginaGz || "").length } }];
