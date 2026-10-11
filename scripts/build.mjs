import { mkdir, copyFile, cp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });
for (const name of ['index.html', 'add.html', 'book-detail.html', 'waitlist.html', '404.html', 'robots.txt'])
  await copyFile(resolve(root, name), resolve(dist, name));
for (const name of ['css', 'js']) await cp(resolve(root, name), resolve(dist, name), { recursive: true });
const context = process.env.CONTEXT || 'dev';
const store = context === 'production' ? 'bookshelf-v1' : `bookshelf-preview-${(process.env.DEPLOY_ID || 'local').replace(/[^a-zA-Z0-9-]/g, '')}`;
await writeFile(resolve(root, 'server/deployment.json'), JSON.stringify({ store }));
console.log(`Built static site in dist; data store: ${store}`);
