import { json, withErrors, requireEditor, HttpError } from './core.mjs';

export function createSearchHandler({ password, fetcher = fetch }) {
  return withErrors(async request => {
    if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
    requireEditor(request, password);
    const q = new URL(request.url).searchParams.get('q')?.trim();
    if (!q || q.length < 2 || q.length > 200) throw new HttpError(400, 'Enter a title, author, or ISBN (2–200 characters).');
    try {
      const url = new URL('https://openlibrary.org/search.json');
      url.search = new URLSearchParams({ q, limit: '12', fields: 'key,title,author_name,first_publish_year,cover_i' });
      const response = await fetcher(url, { signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'PersonalBookshelf/2.0' } });
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      if (data.docs?.length) return json({ books: data.docs.map(book => ({
        title: book.title || '', author: (book.author_name || []).join(', '),
        published_year: book.first_publish_year >= 1000 ? String(book.first_publish_year) : '',
        coverURL: Number.isInteger(book.cover_i) ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '', genre: ''
      })), source: 'Open Library' });
    } catch { /* Manual entry stays available if both catalogs fail. */ }
    try {
      const url = new URL('https://www.googleapis.com/books/v1/volumes');
      url.search = new URLSearchParams({ q, maxResults: '12' });
      const response = await fetcher(url, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      return json({ books: (data.items || []).map(({ volumeInfo: b }) => ({
        title: b.title || '', author: (b.authors || []).join(', '), published_year: /^\d{4}/.test(b.publishedDate || '') ? b.publishedDate.slice(0, 4) : '',
        coverURL: (b.imageLinks?.thumbnail || '').replace(/^http:/, 'https:'), genre: b.categories?.[0] || ''
      })), source: 'Google Books' });
    } catch { throw new HttpError(503, 'Book search is taking a break. You can still add this book by hand below.'); }
  });
}
