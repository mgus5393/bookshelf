export const $ = selector => document.querySelector(selector);
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}
export async function api(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    const timeout = AbortSignal.timeout(20000);
    response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Could not reach the bookshelf. Check your connection and try again.');
  }
  let data;
  try { data = await response.json(); } catch {
    throw new Error(response.status === 429 ? 'A few too many requests. Please wait a minute and try again.' : 'The bookshelf service is unavailable. Please try again shortly.');
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export function message(node, text, kind = '') {
  node.className = `notice ${kind}`;
  node.textContent = text;
}
export function cover(book) {
  const box = el('div', { className: 'cover' }, el('span', { className: 'cover-fallback', text: book.title }));
  try {
    const url = new URL(book.coverURL);
    if (['https:', 'http:'].includes(url.protocol)) {
      url.protocol = 'https:';
      const image = el('img', { src: url.href, alt: `Cover of ${book.title}`, loading: 'lazy', referrerpolicy: 'no-referrer' });
      image.addEventListener('error', () => image.remove(), { once: true });
      box.append(image);
    }
  } catch { /* A missing cover gets a book-shaped title card. */ }
  return box;
}
export function detailURL(book) { return `book-detail.html?id=${encodeURIComponent(book._id)}`; }
export function downloadBooks(books) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' }));
  const a = el('a', { href: url, download: `bookshelf-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
