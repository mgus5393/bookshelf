import { $, el, api, message } from './common.js';
let books = [], unlocked = false;
function render() {
  const query = $('#searchInput').value.trim().toLocaleLowerCase();
  const selected = books.filter(b => `${b.title} ${b.author}`.toLocaleLowerCase().includes(query));
  $('#totalCount').textContent = String(books.length);
  $('#resultsCount').textContent = `${selected.length} ${selected.length === 1 ? 'book' : 'books'}${query ? ` of ${books.length}` : ''}`;
  $('#unlockLink').hidden = unlocked;
  const list = $('#waitlist'); list.replaceChildren();
  if (!selected.length) {
    list.append(el('div', { className: 'empty-state' }, el('h2', { text: books.length ? 'No matching books.' : 'Your next chapter is waiting.' }),
      el('p', { text: books.length ? 'Try another title or author.' : 'Add books you might like to read. They’ll stay separate from the books you’ve finished.' }),
      el('a', { className: 'button', href: 'add.html?list=waitlist', text: 'Add to wait list' })));
  }
  for (const book of selected) {
    const info = el('div', { className: 'waitlist-info' }, el('h3', { text: book.title }), el('p', { className: 'book-author', text: book.author }));
    if (book.notes) info.append(el('p', { className: 'notes', text: book.notes }));
    const row = el('article', { className: 'waitlist-row' }, info);
    if (unlocked) {
      const remove = el('button', { className: 'secondary', text: 'Remove', 'aria-label': `Remove ${book.title} from wait list` });
      remove.addEventListener('click', async () => {
        if (!confirm(`Remove “${book.title}” from the wait list?`)) return;
        remove.disabled = true;
        try {
          await api('waitlist', { method: 'DELETE', body: { _id: book._id, version: book.version } });
          books = books.filter(b => b._id !== book._id); render(); message($('#waitlistMessage'), `Removed “${book.title}” from the wait list.`, 'success');
        } catch (error) {
          if (error.status === 401) { unlocked = false; render(); }
          message($('#waitlistMessage'), error.message, 'error'); remove.disabled = false;
        }
      });
      row.append(el('div', { className: 'waitlist-actions' }, el('a', { href: `add.html?list=waitlist&id=${encodeURIComponent(book._id)}`, text: 'Edit' }), remove));
    }
    list.append(row);
  }
}
async function load() {
  try {
    ({ books } = await api('waitlist')); books.sort((a, b) => b.order - a.order);
    try { unlocked = (await api('session')).authenticated; } catch { /* Public browsing remains available. */ }
    render();
  } catch (error) {
    const retry = el('button', { text: 'Try again' }); retry.addEventListener('click', load);
    $('#waitlist').replaceChildren(el('p', { text: error.message }), retry);
  } finally { $('#waitlist').setAttribute('aria-busy', 'false'); }
}
$('#searchInput').addEventListener('input', render);
load();
