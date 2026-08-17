const fs = require('fs');
const src = fs.readFileSync(__dirname + '/pokemon-catalog-scanner.workflow.js', 'utf8');
const start = src.indexOf('jsCode: "// ===== Catalog Scanner');
const end = src.indexOf('const injetar', start);
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}
const stub = 'jsCode: "return [{ json: { decisao: \'erro_parser\', slug: \'\', error_msg: \'parser ainda nao instalado\', payload_json: \'{}\' } }];"\n    }\n  }\n});\n\n';
const slim = src.slice(0, start) + stub + src.slice(end);
fs.writeFileSync(__dirname + '/pokemon-catalog-scanner.slim.js', slim);
console.log('slim bytes', Buffer.byteLength(slim));
