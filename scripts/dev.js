// Servidor de desenvolupament local: serveix /public i executa les funcions
// de /api igual que Vercel. Ús: npm run dev  →  http://localhost:3000
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const TIPUS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
const PORT = process.env.PORT || 3000;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    const nom = url.pathname.slice(5).replace(/[^a-z]/g, '');
    try {
      const mod = await import(pathToFileURL(join(process.cwd(), 'api', `${nom}.js`)).href);
      return mod.default(req, res);
    } catch {
      res.statusCode = 404; return res.end('{"ok":false,"error":"No trobat"}');
    }
  }
  const ruta = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const dades = await readFile(join(process.cwd(), 'public', ruta));
    res.setHeader('Content-Type', TIPUS[extname(ruta)] || 'application/octet-stream');
    res.end(dades);
  } catch {
    res.statusCode = 404; res.end('No trobat');
  }
}).listen(PORT, () => console.log(`PistaYa a http://localhost:${PORT}`));
