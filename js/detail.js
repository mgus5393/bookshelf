import { $, el, api, cover, message } from './common.js';
async function load() {
  try {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) throw new Error('No book was selected.');
    const { books } = await api('books');
    const book = books.find(b => b._id === id);
    if (!book) throw new Error('This book is no longer on the shelf.');
    document.title = `${book.title} · The Bookshelf`;
    const info = el('section', {}, el('p', { className: 'eyebrow', text: 'From the collection' }), el('h1', { text: book.title }), el('p', { className: 'detail-author', text: book.author }));
    const meta = el('dl', { className: 'detail-meta' });
    for (const [label, value] of [['Year read', book.year_read], ['Published', book.published_year], ['Genre', book.genre]])
      if (value) meta.append(el('dt', { text: label }), el('dd', { text: value }));
    info.append(meta);
    if (book.notes) info.append(el('h2', { text: 'A little note' }), el('p', { className: 'notes', text: book.notes }));
    const actions = el('div', { className: 'detail-actions' }, el('a', { className: 'button', href: `add.html?id=${encodeURIComponent(id)}`, text: 'Edit this book' }));
    info.append(actions); $('#bookDetail').replaceChildren(cover(book), info);
    // A failed session check must not prevent public browsing.
    try {
      const session = await api('session');
      if (session.authenticated) {
        const remove = el('button', { className: 'secondary', text: 'Remove from shelf' });
        remove.addEventListener('click', async () => {
          if (!confirm(`Remove “${book.title}” from the bookshelf?`)) return;
          remove.disabled = true;
          try { await api('books', { method: 'DELETE', body: { _id: id, version: book.version } }); location.href = 'index.html'; }
          catch (error) { message($('#detailMessage'), error.message, 'error'); remove.disabled = false; }
        });
        actions.append(remove);
      }
    } catch { /* Editing link still leads to the sign-in page. */ }
  } catch (error) { $('#bookDetail').replaceChildren(el('div', { className: 'notice error', text: error.message })); }
}
load();
