import { getStore } from '@netlify/blobs';
import { createBooksHandler, normalizeSeed } from '../../server/core.mjs';
import seed from '../../books.json' with { type: 'json' };
import deployment from '../../server/deployment.json' with { type: 'json' };

export default request => createBooksHandler({
  store: getStore({ name: deployment.store, consistency: 'strong' }),
  seed: normalizeSeed(seed), password: process.env.BOOKSHELF_PASSWORD
})(request);
export const config = { path: '/api/books', rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
