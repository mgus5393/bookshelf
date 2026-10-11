import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { createBooksHandler, createSessionHandler, normalizeSeed } from '../server/core.mjs';
import { createSearchHandler } from '../server/search.mjs';

const root = resolve(import.meta.dirname, '..');
const storage = resolve(root, '.local-data');
await mkdir(storage, { recursive: true });
const password = process.env.BOOKSHELF_PASSWORD || randomBytes(18).toString('base64url');
const seed = normalizeSeed(JSON.parse(await readFile(resolve(root, 'books.json'), 'utf8')));
let queue = Promise.resolve();
const store = {
  async getWithMetadata(key = 'collection') {
    const dataPath = resolve(storage, `${key}.json`);
    try {
      const text = await readFile(dataPath, 'utf8');
      return { data: JSON.parse(text), etag: createHash('sha256').update(text).digest('hex') };
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  },
  async setJSON(key, value, options) {
    const dataPath = resolve(storage, `${key}.json`);
    const write = queue.then(async () => {
      const record = await this.getWithMetadata(key);
      if ((options.onlyIfNew && record) || (options.onlyIfMatch && options.onlyIfMatch !== record?.etag)) return { modified: false };
      await writeFile(`${dataPath}.tmp`, JSON.stringify(value));
      await rename(`${dataPath}.tmp`, dataPath);
      return { modified: true };
    });
    queue = write.catch(() => {});
    return write;
  }
};
const handlers = {
  '/api/books': createBooksHandler({ store, seed, password }),
  '/api/waitlist': createBooksHandler({ store, seed: [], password, storageKey: 'waitlist' }),
  '/api/session': createSessionHandler(password),
  '/api/search': createSearchHandler({ password })
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const server = createServer(async (req, res) => {
  try {
    const hostname = (req.headers.host || '').split(':')[0];
    if (!['localhost', '127.0.0.1'].includes(hostname)) { res.writeHead(403); res.end(); return; }
    const url = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (handlers[url.pathname]) {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 20000) { res.writeHead(413); res.end(); return; }
        chunks.push(chunk);
      }
      const response = await handlers[url.pathname](new Request(url, { method: req.method, headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text()); return;
    }
    const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = resolve(root, `.${path}`);
    const allowed = ['index.html', 'add.html', 'book-detail.html', 'waitlist.html', '404.html', 'robots.txt'].includes(path.slice(1)) || /^\/(js|css)\/[^/]+\.(js|css)$/.test(path);
    if (!target.startsWith(root + sep) || !allowed) { res.writeHead(404); res.end('Not found'); return; }
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(content);
  } catch { res.writeHead(500); res.end('Local server error'); }
});
const port = Number(process.env.PORT || 8888);
server.listen(port, '127.0.0.1', () => {
  console.log(`Local preview: http://127.0.0.1:${port}`);
  if (!process.env.BOOKSHELF_PASSWORD) console.log(`Temporary local editing password: ${password}`);
  console.log('Local saves stay in .local-data; production books are never changed.');
});
