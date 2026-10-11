import { createSearchHandler } from '../../server/search.mjs';
export default request => createSearchHandler({ password: process.env.BOOKSHELF_PASSWORD })(request);
export const config = { path: '/api/search', rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
