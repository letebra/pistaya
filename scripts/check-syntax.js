// Comprova la sintaxi de tots els fitxers JavaScript del projecte (CI).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const arrels = ['api', 'lib', 'public/js', 'scripts', 'tests'];
const fitxers = [];
const recorre = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) recorre(p); else if (p.endsWith('.js')) fitxers.push(p);
});
arrels.forEach(recorre);
for (const f of fitxers) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log(`Sintaxi correcta a ${fitxers.length} fitxers.`);
