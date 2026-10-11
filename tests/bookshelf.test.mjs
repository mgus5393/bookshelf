import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBooksHandler, createSessionHandler, normalizeSeed, authenticated } from '../server/core.mjs';
import { createSearchHandler } from '../server/search.mjs';
const password = 'test-only-long-passphrase';
const origin = 'https://bookshelf.example';
const session = createSessionHandler(password);
const request = (path, method = 'GET', body, cookie = '', extra = {}) => new Request(origin + path, {
  method, headers: { origin, 'content-type': 'application/json', cookie, ...extra }, body: body === undefined ? undefined : JSON.stringify(body)
});
const login = await session(request('/api/session', 'POST', { password }));
const cookie = login.headers.get('set-cookie').split(';')[0];
const seed = normalizeSeed(JSON.parse(await readFile(new URL('../books.json', import.meta.url))));
function fixture() {
  let data = null, version = 0;
  const store = {
    async getWithMetadata() { return data === null ? null : { data: structuredClone(data), etag: String(version) }; },
    async setJSON(key, value, options) {
      if (options.onlyIfNew && data !== null || options.onlyIfMatch && options.onlyIfMatch !== String(version)) return { modified: false };
      data = structuredClone(value); version++; return { modified: true, etag: String(version) };
    }
  };
  return { store, handler: createBooksHandler({ store, seed, password }) };
}
const book = (id = 'new-book') => ({ _id: id, title: 'A New Book', author: 'An Author', year_read: '2026' });
test('all 178 legacy books and stable IDs survive normalization', () => {
  assert.equal(seed.length, 178); assert.equal(new Set(seed.map(b => b._id)).size, 178);
  assert.equal(seed[0]._id, 'book-1'); assert.equal(seed.at(-1)._id, 'book-1773005989176');
  assert.ok(seed.every(b => !b.coverURL.startsWith('http:')));
});
test('public reads work; anonymous and foreign-origin writes are rejected', async () => {
  const { handler } = fixture();
  assert.equal((await (await handler(request('/api/books'))).json()).books.length, 178);
  assert.equal((await handler(request('/api/books', 'POST', book()))).status, 401);
  assert.equal((await handler(request('/api/books', 'POST', book(), cookie, { origin: 'https://other.example' }))).status, 403);
});
test('session cookies are HttpOnly, secure, expiring, and invalid after password rotation', async () => {
  assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Max-Age=2592000; Secure/);
  assert.equal(authenticated(request('/', 'GET', undefined, cookie), password), true);
  assert.equal(authenticated(request('/', 'GET', undefined, cookie), 'different-long-password'), false);
  assert.equal(authenticated(request('/', 'GET', undefined, cookie), password, Date.now() + 31 * 86400000), false);
  assert.equal(authenticated(request('/', 'GET', undefined, cookie + 'x'), password), false);
  assert.equal((await session(request('/api/session', 'POST', { password: 'wrong' }))).status, 401);
  const logout = await session(request('/api/session', 'DELETE', undefined, cookie));
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});
test('missing or short password fails closed for editing but allows browsing', async () => {
  const { store } = fixture();
  const handler = createBooksHandler({ store, seed, password: '' });
  assert.equal((await handler(request('/api/books'))).status, 200);
  assert.equal((await handler(request('/api/books', 'POST', book(), cookie))).status, 503);
});
test('add, immediately read on another client, edit, stale edit, and remove', async () => {
  const { handler } = fixture();
  const added = await handler(request('/api/books', 'POST', book(), cookie)); assert.equal(added.status, 201);
  const saved = (await added.json()).book; assert.equal(saved.order, 179);
  const read = await (await handler(request('/api/books'))).json(); assert.equal(read.books.length, 179);
  const updated = await handler(request('/api/books', 'PUT', { ...saved, notes: 'A favorite.' }, cookie));
  assert.equal(updated.status, 200); const edited = (await updated.json()).book; assert.equal(edited.version, 2);
  assert.equal((await handler(request('/api/books', 'PUT', saved, cookie))).status, 409);
  assert.equal((await handler(request('/api/books', 'DELETE', { _id: saved._id, version: 1 }, cookie))).status, 409);
  assert.equal((await handler(request('/api/books', 'DELETE', { _id: saved._id, version: 2 }, cookie))).status, 200);
  assert.equal((await (await handler(request('/api/books'))).json()).books.length, 178);
});
test('lost-response retries do not duplicate; same title/author/year duplicates rejected', async () => {
  const { handler } = fixture();
  assert.equal((await handler(request('/api/books', 'POST', book(), cookie))).status, 201);
  assert.equal((await handler(request('/api/books', 'POST', book(), cookie))).status, 200);
  assert.equal((await handler(request('/api/books', 'POST', book('other-id'), cookie))).status, 409);
  assert.equal((await handler(request('/api/books', 'POST', { ...book('reread'), year_read: '2027' }, cookie))).status, 201);
});
test('concurrent first saves preserve seed and both additions', async () => {
  const { handler } = fixture();
  const results = await Promise.all(['one', 'two'].map(n => handler(request('/api/books', 'POST', { ...book(n), title: n }, cookie))));
  assert.deepEqual(results.map(r => r.status), [201, 201]);
  const { books } = await (await handler(request('/api/books'))).json();
  assert.equal(books.length, 180); assert.deepEqual(books.slice(-2).map(b => b.order), [179, 180]);
});
test('stored collection is authoritative across redeploys, even if empty', async () => {
  const { store, handler } = fixture();
  await handler(request('/api/books', 'POST', book(), cookie));
  const redeployed = createBooksHandler({ store, seed: [], password });
  assert.equal((await (await redeployed(request('/api/books'))).json()).books.length, 179);
  const current = await store.getWithMetadata(); await store.setJSON('collection', [], { onlyIfMatch: current.etag });
  assert.equal((await (await handler(request('/api/books'))).json()).books.length, 0);
});
test('bad input rejected; HTML stored as inert text; server controls order/version', async () => {
  const { handler } = fixture();
  for (const changes of [{ title: '' }, { author: [] }, { year_read: 'bad' }, { coverURL: 'javascript:alert(1)' }, { notes: 'x'.repeat(5001) }, { _id: '../bad' }])
    assert.equal((await handler(request('/api/books', 'POST', { ...book(), ...changes }, cookie))).status, 400);
  const response = await handler(request('/api/books', 'POST', { ...book(), title: '<img onerror=alert(1)>', order: -100, version: 99 }, cookie));
  const result = (await response.json()).book; assert.equal(result.version, 1); assert.equal(result.order, 179);
});
test('storage outage returns an error instead of silently showing or overwriting old data', async () => {
  const handler = createBooksHandler({ store: { getWithMetadata() { throw new Error('offline'); } }, seed, password });
  assert.equal((await handler(request('/api/books'))).status, 503);
  assert.equal((await handler(request('/api/books', 'POST', book(), cookie))).status, 503);
});
test('catalog fallback works and outages still allow manual saving', async () => {
  let calls = 0;
  const search = createSearchHandler({ password, fetcher: async () => {
    calls++;
    return calls === 1 ? new Response('', { status: 503 }) : Response.json({ items: [{ volumeInfo: { title: 'Found book', authors: ['Writer'] } }] });
  }});
  const result = await search(request('/api/search?q=book', 'GET', undefined, cookie));
  assert.equal(result.status, 200); assert.equal((await result.json()).source, 'Google Books');
  assert.equal((await search(request('/api/search?q=book'))).status, 401);
  const outage = createSearchHandler({ password, fetcher: async () => { throw new Error('offline'); } });
  assert.equal((await outage(request('/api/search?q=book', 'GET', undefined, cookie))).status, 503);
  assert.equal((await fixture().handler(request('/api/books', 'POST', book(), cookie))).status, 201);
});
