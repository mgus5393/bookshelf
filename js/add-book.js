import { $, el, api, cover, message, detailURL } from './common.js';
const form = $('#bookForm');
const editId = new URLSearchParams(location.search).get('id');
const waiting = new URLSearchParams(location.search).get('list') === 'waitlist';
const endpoint = waiting ? 'waitlist' : 'books';
const initialFields = () => ({ year_read: waiting ? '' : new Date().getFullYear() });
if (waiting) {
  $('#pageTitle').textContent = 'A book for later.';
  $('#pageIntro').textContent = 'Find a book you might like to read and save it to your wait list.';
  document.title = "Add to wait list · Rebecca's Bookshelf";
  const addLink = document.querySelector('nav a[aria-current="page"]');
  addLink.href = 'add.html?list=waitlist'; addLink.textContent = 'Add to wait list';
  $('#saveBtn').textContent = 'Add to wait list';
  form.elements.namedItem('year_read').closest('label').hidden = true;
  const back = form.querySelector('a'); back.href = 'waitlist.html'; back.textContent = 'Back to wait list';
}
let currentBook = null;
let saveId = crypto.randomUUID();
let dirty = false;
let saving = false;
let loaded = false;
let searchController;
const fields = ['title', 'author', 'year_read', 'published_year', 'genre', 'coverURL', 'notes'];
function fill(book) { fields.forEach(key => { form.elements.namedItem(key).value = book[key] ?? ''; }); }
function revealEditor() { $('#loginPanel').hidden = true; $('#editor').hidden = false; $('#sessionMessage').textContent = ''; }
function requireLogin(text) {
  $('#editor').hidden = true; $('#loginPanel').hidden = false;
  message($('#loginMessage'), text || '');
}
async function initializeEditor() {
  if (loaded) return;
  if (editId) {
    const { books } = await api(endpoint);
    currentBook = books.find(b => b._id === editId);
    if (!currentBook) throw new Error('This book could not be found. Return to the collection and choose a book.');
    $('#pageTitle').textContent = 'A little revision.';
    $('#pageIntro').textContent = 'Update the details, then save them to your bookshelf.';
    $('#searchPanel').hidden = true;
    $('#saveBtn').textContent = 'Save changes';
    document.title = 'Edit a book · The Bookshelf';
    fill(currentBook);
  } else fill(initialFields());
  loaded = true;
}
async function start() {
  try {
    const session = await api('session');
    if (!session.configured) { message($('#sessionMessage'), 'The shelf is open for browsing. Editing needs a one-time setup by the site owner.'); return; }
    if (!session.authenticated) { $('#sessionMessage').textContent = ''; requireLogin(); return; }
    await initializeEditor(); revealEditor();
  } catch (error) { message($('#sessionMessage'), error.message, 'error'); }
}
$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault(); $('#unlockBtn').disabled = true;
  try {
    await api('session', { method: 'POST', body: { password: $('#password').value } });
    $('#password').value = '';
    await initializeEditor(); revealEditor();
  } catch (error) { message($('#loginMessage'), error.message, 'error'); }
  finally { $('#unlockBtn').disabled = false; }
});
$('#lockBtn').addEventListener('click', async () => {
  if (dirty && !confirm('Lock editing? Your unsaved details will stay in this tab.')) return;
  try { await api('session', { method: 'DELETE' }); requireLogin('Editing is locked.'); }
  catch (error) { message($('#saveMessage'), error.message, 'error'); }
});
$('#manualBtn').addEventListener('click', () => { $('#bookPanel').scrollIntoView({ block: 'start' }); $('#title').focus(); });
$('#searchForm').addEventListener('submit', async event => {
  event.preventDefault(); searchController?.abort();
  searchController = new AbortController();
  const controller = searchController;
  $('#searchBtn').disabled = true; $('#searchResults').replaceChildren();
  $('#searchStatus').textContent = 'Looking through the catalog…';
  try {
    const data = await api(`search?q=${encodeURIComponent($('#searchInput').value.trim())}`, { signal: controller.signal });
    if (controller.signal.aborted) return;
    $('#searchStatus').textContent = data.books.length ? `Results from ${data.source}. Choose a book to fill in its details.` : 'No match this time. Try another search, or enter the details below.';
    data.books.forEach(book => {
      const choose = el('button', { type: 'button', text: 'Choose this book' });
      choose.addEventListener('click', () => {
        if (dirty && !confirm('Replace the current book details with this search result?')) return;
        fill({ ...book, year_read: waiting ? '' : form.elements.namedItem('year_read').value || new Date().getFullYear() });
        saveId = crypto.randomUUID(); dirty = true;
        message($('#saveMessage'), 'Details filled in. Check the title and author, then save.');
        $('#bookPanel').scrollIntoView({ block: 'start' }); $('#title').focus();
      });
      $('#searchResults').append(el('article', { className: 'search-result' }, cover(book),
        el('div', { className: 'search-result-info' }, el('h3', { text: book.title }), el('p', { text: `${book.author || 'Author not listed'}${book.published_year ? ` · ${book.published_year}` : ''}` }), choose)));
    });
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#searchStatus').textContent = error.message;
    if (error.status === 401) requireLogin(error.message);
  } finally { if (searchController === controller) $('#searchBtn').disabled = false; }
});
form.addEventListener('input', () => { dirty = true; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;
  saving = true; $('#saveBtn').disabled = true; $('#editor').inert = true;
  const body = Object.fromEntries(new FormData(form));
  body._id = editId || saveId;
  if (editId) body.version = currentBook.version;
  message($('#saveMessage'), 'Saving to your bookshelf…');
  try {
    const { book } = await api(endpoint, { method: editId ? 'PUT' : 'POST', body });
    dirty = false;
    message($('#saveMessage'), editId ? 'Changes saved. ' : waiting ? 'Added to your wait list. ' : 'Added to your bookshelf. ', 'success');
    $('#saveMessage').append(el('a', { href: waiting ? 'waitlist.html' : detailURL(book), text: waiting ? 'View wait list →' : 'View your book →' }));
    if (editId) currentBook = book;
    else {
      form.reset(); fill(initialFields()); saveId = crypto.randomUUID();
      $('#searchResults').replaceChildren(); $('#searchStatus').textContent = ''; $('#searchInput').value = '';
    }
  } catch (error) {
    message($('#saveMessage'), `${error.message} Your details have been kept in this tab.`, 'error');
    if (error.status === 401) requireLogin(error.message);
  } finally { saving = false; $('#saveBtn').disabled = false; $('#editor').inert = false; }
});
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
start();
