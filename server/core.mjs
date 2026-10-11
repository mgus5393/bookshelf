import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto';

const COOKIE = 'bookshelf_session';
const AGE = 60 * 60 * 24 * 30;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...headers
  }});
}
function equal(a, b) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
function signature(value, password) {
  return createHmac('sha256', password).update(`bookshelf-session-v1:${value}`).digest('base64url');
}
export function configured(password) { return typeof password === 'string' && password.length >= 16; }
export function authenticated(request, password, now = Date.now()) {
  if (!configured(password)) return false;
  const cookie = (request.headers.get('cookie') || '').split(';').map(c => c.trim())
    .find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!cookie || cookie.length > 250) return false;
  const [expires, nonce, sig, extra] = cookie.split('.');
  return !extra && /^\d+$/.test(expires) && /^[\w-]{36}$/.test(nonce || '') &&
    Number(expires) > now && Number(expires) <= now + AGE * 1000 &&
    equal(sig || '', signature(`${expires}.${nonce}`, password));
}
function cookie(request, value, age) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`;
}
export function requireEditor(request, password) {
  if (!configured(password)) throw new HttpError(503, 'Editing is not set up yet. Ask the site owner to finish setup.');
  if (!authenticated(request, password)) throw new HttpError(401, 'Please unlock your bookshelf to save changes.');
}
export function checkOrigin(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new HttpError(403, 'Open the bookshelf website to make changes.');
}
export async function readJSON(request, limit = 16384) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new HttpError(415, 'Expected a JSON request.');
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'Request is too large.');
  const text = await request.text();
  if (Buffer.byteLength(text) > limit) throw new HttpError(413, 'Request is too large.');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Could not read that request.'); }
}
export function withErrors(handler) {
  return async request => {
    try { return await handler(request); }
    catch (error) {
      if (!(error instanceof HttpError)) console.error('Bookshelf request failed:', error.name);
      return json({ error: error instanceof HttpError ? error.message : 'The bookshelf could not be reached. Please try again; your form is still here.' }, error instanceof HttpError ? error.status : 503);
    }
  };
}
export function createSessionHandler(password) {
  return withErrors(async request => {
    if (request.method === 'GET') return json({ configured: configured(password), authenticated: authenticated(request, password) });
    checkOrigin(request);
    if (request.method === 'DELETE') return json({ authenticated: false }, 200, { 'Set-Cookie': cookie(request, '', 0) });
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    if (!configured(password)) throw new HttpError(503, 'Editing is not set up yet. Ask the site owner to finish setup.');
    const body = await readJSON(request, 2048);
    if (typeof body?.password !== 'string' || !equal(body.password, password)) throw new HttpError(401, 'That password did not match. Please try again.');
    const payload = `${Date.now() + AGE * 1000}.${randomUUID()}`;
    return json({ authenticated: true }, 200, { 'Set-Cookie': cookie(request, `${payload}.${signature(payload, password)}`, AGE) });
  });
}
function string(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new HttpError(400, `Please enter a valid ${label}${required ? ' (required)' : ''}.`);
  return value.trim();
}
function year(value, label, publication = false) {
  if (value === '' || value === null || value === undefined) return '';
  if (!(publication ? /^\d{1,4}$/ : /^\d{4}$/).test(String(value)) || Number(value) < (publication ? 1 : 1000) || Number(value) > 9999)
    throw new HttpError(400, `Please enter a valid ${label}.`);
  return String(value);
}
export function validateBook(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object') throw new HttpError(400, 'Invalid book.');
  const coverURL = string(input.coverURL || '', 2048, 'cover URL');
  if (coverURL) {
    let url;
    try { url = new URL(coverURL); } catch { throw new HttpError(400, 'The cover must be an HTTPS image URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new HttpError(400, 'The cover must be an HTTPS image URL.');
  }
  return {
    title: string(input.title, 300, 'title', true), author: string(input.author, 300, 'author', true),
    genre: string(input.genre || '', 120, 'genre'), coverURL: coverURL.replace(/^http:/, 'https:'),
    published_year: year(input.published_year, 'publication year', true), year_read: year(input.year_read, 'year read'),
    notes: string(input.notes || '', 5000, 'notes')
  };
}
export function normalizeSeed(books) {
  return books.map((book, i) => ({
    ...validateBook({ ...book, coverURL: book.coverURL ?? book.cover_url ?? '',
      published_year: book.published_year ?? book['published year'], year_read: book.year_read ?? book['year read'] }),
    _id: String(book._id ?? book.id ?? `book-${i + 1}`), order: Number(book.order) || i + 1, version: 1
  }));
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new HttpError(400, 'Invalid book ID.');
  return value;
}
function duplicate(a, b) {
  const key = v => v.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  return key(a.title) === key(b.title) && key(a.author) === key(b.author) && a.year_read === b.year_read;
}
export function createBooksHandler({ store, seed, password }) {
  return withErrors(async request => {
    const method = request.method;
    if (method !== 'GET') { checkOrigin(request); requireEditor(request, password); }
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) throw new HttpError(405, 'Method not allowed.');
    const input = method === 'GET' ? null : await readJSON(request);
    const bookId = method === 'GET' ? null : id(input?._id);
    const fields = ['POST', 'PUT'].includes(method) ? validateBook(input) : null;
    // Compare-and-swap prevents lost updates and makes the first seed migration atomic.
    // Storage failures must never silently fall back to the old seed collection.
    for (let attempt = 0; attempt < 5; attempt++) {
      const record = await store.getWithMetadata('collection', { type: 'json', consistency: 'strong' });
      const books = record === null ? structuredClone(seed) : record.data;
      if (!Array.isArray(books)) throw new Error('Invalid stored collection');
      if (method === 'GET') return json({ books });
      const index = books.findIndex(b => b._id === bookId);
      let saved;
      if (method === 'POST') {
        if (index !== -1) {
          if (Object.keys(fields).every(key => books[index][key] === fields[key])) return json({ book: books[index] });
          throw new HttpError(409, 'That save has already been used. Reload before adding another book.');
        }
        if (books.length >= 10000) throw new HttpError(400, 'This bookshelf is full.');
        if (books.some(b => duplicate(b, fields))) throw new HttpError(409, 'This book is already on the shelf for that year. You can edit it from its detail page.');
        saved = { ...fields, _id: bookId, version: 1, order: Math.max(0, ...books.map(b => Number(b.order) || 0)) + 1 };
        books.push(saved);
      } else {
        if (index === -1) throw new HttpError(404, 'That book is no longer on the shelf.');
        if (input.version !== books[index].version) throw new HttpError(409, 'This book changed in another window. Reload to see the latest version before editing.');
        if (method === 'DELETE') books.splice(index, 1);
        else {
          if (books.some((b, i) => i !== index && duplicate(b, fields))) throw new HttpError(409, 'Another copy of this book is already on the shelf for that year.');
          saved = { ...books[index], ...fields, version: books[index].version + 1 };
          books[index] = saved;
        }
      }
      const result = await store.setJSON('collection', books, record ? { onlyIfMatch: record.etag } : { onlyIfNew: true });
      if (result.modified) return json(saved ? { book: saved } : { deleted: true }, method === 'POST' ? 201 : 200);
    }
    throw new HttpError(409, 'Someone else is saving right now. Please try again.');
  });
}
