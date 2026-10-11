import { getStore } from '@netlify/blobs';
import { createBooksHandler } from '../../server/core.mjs';
import deployment from '../../server/deployment.json' with { type: 'json' };

export default request => createBooksHandler({
  store: getStore({ name: deployment.store, consistency: 'strong' }),
  seed: [], storageKey: 'waitlist', password: process.env.BOOKSHELF_PASSWORD
})(request);
export const config = { path: '/api/waitlist', rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
