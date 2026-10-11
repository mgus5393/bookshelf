import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStore } from '@netlify/blobs';
import { BlobsServer } from '@netlify/blobs/server';
import { createBooksHandler, createSessionHandler } from '../server/core.mjs';

test('actual Netlify Blobs SDK persists books and handles conditional updates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bookshelf-blobs-test-'));
  const server = new BlobsServer({ directory, token: 'local-test-token' });
  const { port } = await server.start();
  try {
    const store = getStore({ name: 'bookshelf-test', siteID: 'local-test-site', token: 'local-test-token',
      apiURL: `http://localhost:${port}`, consistency: 'strong' });
    const password = 'test-only-long-passphrase';
    const origin = 'https://bookshelf.example';
    const login = await createSessionHandler(password)(new Request(origin + '/api/session', {
      method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password })
    }));
    const headers = { origin, 'Content-Type': 'application/json', cookie: login.headers.get('set-cookie').split(';')[0] };
    const handler = createBooksHandler({ store, seed: [], password });
    const input = { _id: 'integration-book', title: 'SDK integration', author: 'Test author', year_read: '2026' };
    const added = await handler(new Request(origin + '/api/books', { method: 'POST', headers, body: JSON.stringify(input) }));
    assert.equal(added.status, 201, await added.clone().text());
    const saved = (await added.json()).book;
    const edited = await handler(new Request(origin + '/api/books', { method: 'PUT', headers, body: JSON.stringify({ ...saved, title: 'Edited through SDK' }) }));
    assert.equal(edited.status, 200, await edited.clone().text());
    const record = await store.getWithMetadata('collection', { type: 'json' });
    assert.equal(record.data[0].title, 'Edited through SDK');
    assert.equal((await store.setJSON('collection', [], { onlyIfMatch: 'stale-etag' })).modified, false);
    assert.equal((await store.setJSON('collection', [], { onlyIfNew: true })).modified, false);
    const restarted = createBooksHandler({ store, seed: [], password });
    const books = (await (await restarted(new Request(origin + '/api/books'))).json()).books;
    assert.equal(books[0].version, 2);
  } finally { await server.stop(); }
});
