// Gera o jsCode do node "Montar Pagina" (workflow Replica Painel) a partir do HTML versionado.
//
// Uso:
//   node tools/gerar-painel-code-node.mjs
//
// Entrada:  backups/<data>/painel/replica-painel.html
// Saida:    backups/<data>/code-nodes/replica-painel--montar-pagina.js
//
// Por que existe: o Code node do n8n guarda a pagina como lista de strings. Escrever isso
// na mao quebra facil, entao o HTML fica em arquivo proprio (editavel, com destaque de sintaxe)
// e este script faz a conversao. O HTML nao pode ter aspas duplas nem barra invertida, porque
// as linhas viram strings de aspas duplas dentro do Code node.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PASTA = process.argv[2] || 'backups/2026-08-28';
const ENTRADA = join(PASTA, 'painel', 'replica-painel.html');
const SAIDA = join(PASTA, 'code-nodes', 'replica-painel--montar-pagina.js');

const html = readFileSync(ENTRADA, 'utf8').replace(/\r\n/g, '\n');

const proibidos = [];
html.split('\n').forEach((linha, i) => {
  if (linha.includes('"') || linha.includes('\\')) {
    proibidos.push(`  linha ${i + 1}: ${linha.trim()}`);
  }
});
if (proibidos.length) {
  console.error('HTML tem aspas duplas ou barra invertida, o que quebra o Code node:');
  console.error(proibidos.join('\n'));
  process.exit(1);
}
if (!html.includes('__DADOS__')) {
  console.error('HTML sem o marcador __DADOS__.');
  process.exit(1);
}

const linhas = html.split('\n').map((linha) => `  "${linha}"`).join(',\n');

// join(String.fromCharCode(10)) em vez de join('\n') de proposito: o codigo gerado ainda passa
// por um template literal quando sobe para o n8n, e barra invertida nao sobrevive a essa viagem.
const saida = `// Replica Painel -> node "Montar Pagina"
// GERADO POR tools/gerar-painel-code-node.mjs A PARTIR DE ${ENTRADA.replace(/\\/g, '/')}
// Nao edite aqui: mexa no HTML e rode o gerador de novo.
const dados = $input.first().json.painel || {};
// Token de save (NAO e a senha do Basic Auth). Chrome nao reenvia Basic Auth no fetch.
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
const codificado = Buffer.from(JSON.stringify(dados)).toString("base64");

const PAGINA = [
${linhas}
].join(String.fromCharCode(10));

return [{ json: { html: PAGINA.replace("__DADOS__", codificado) } }];
`;

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, saida, 'utf8');
console.log(`ok: ${SAIDA} (${html.split('\n').length} linhas de HTML)`);
