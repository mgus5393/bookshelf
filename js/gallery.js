import { $, el, api, cover, detailURL, downloadBooks } from './common.js';
let books = [];
function render() {
  const query = $('#searchInput').value.trim().toLocaleLowerCase();
  const year = $('#yearFilter').value;
  const genre = $('#genreFilter').value;
  const selected = books.filter(b => `${b.title} ${b.author}`.toLocaleLowerCase().includes(query) && (!year || b.year_read === year) && (!genre || b.genre === genre));
  $('#resultsCount').textContent = `${selected.length} ${selected.length === 1 ? 'book' : 'books'}${selected.length !== books.length ? ` of ${books.length}` : ''}`;
  const grid = $('#booksGrid'); grid.replaceChildren();
  if (!selected.length) {
    grid.append(el('div', { className: 'empty-state' }, el('h2', { text: books.length ? 'No books on this shelf.' : 'Your first chapter starts here.' }),
      el('p', { text: books.length ? 'Try a different title, year, or genre.' : 'Add a book to begin your collection.' })));
    return;
  }
  for (const book of selected) {
    const card = el('a', { className: 'book-card', href: detailURL(book) }, cover(book), el('h3', { text: book.title }), el('p', { className: 'book-author', text: book.author }));
    if (book.year_read) card.append(el('p', { className: 'book-year', text: `READ IN ${book.year_read}` }));
    grid.append(card);
  }
}
async function load() {
  const grid = $('#booksGrid');
  try {
    ({ books } = await api('books'));
    books.sort((a, b) => b.order - a.order);
    $('#totalCount').textContent = String(books.length);
    for (const [selector, field] of [['#yearFilter', 'year_read'], ['#genreFilter', 'genre']]) {
      const values = [...new Set(books.map(b => b[field]).filter(Boolean))].sort();
      if (field === 'year_read') values.reverse();
      values.forEach(value => $(selector).append(el('option', { value, text: value })));
    }
    $('#backupBtn').disabled = false;
    render();
  } catch (error) {
    const retry = el('button', { text: 'Try again' }); retry.addEventListener('click', () => location.reload());
    grid.replaceChildren(el('div', { className: 'empty-state' }, el('h2', { text: 'The shelf is temporarily out of reach.' }), el('p', { text: error.message }), retry));
  } finally { grid.setAttribute('aria-busy', 'false'); }
}
$('#searchInput').addEventListener('input', render);
$('#yearFilter').addEventListener('change', render);
$('#genreFilter').addEventListener('change', render);
$('#clearFilters').addEventListener('click', () => { ['#searchInput', '#yearFilter', '#genreFilter'].forEach(s => $(s).value = ''); render(); });
$('#backupBtn').addEventListener('click', () => downloadBooks(books));
load();
