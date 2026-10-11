import { createSessionHandler } from '../../server/core.mjs';
export default request => createSessionHandler(process.env.BOOKSHELF_PASSWORD)(request);
export const config = { path: '/api/session', rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
