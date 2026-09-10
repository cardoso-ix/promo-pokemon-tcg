import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('src/public');
const dest = path.resolve('dist/public');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Assets estáticos copiados para: ${dest}`);
}
