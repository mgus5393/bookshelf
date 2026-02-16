// Global state
let allBooks = [];
let filteredBooks = [];

// Load and display books
// async function loadBooks() {
//     try {
//         const response = await fetch('books.json');
//         if (!response.ok) {
//             throw new Error('Failed to load books');
//         }
//         allBooks = await response.json();
//         filteredBooks = [...allBooks];
        
//         populateFilters();
//         applyFilters(); // will call displayBooks + count
//         setupEventListeners();
//     } catch (error) {
//         console.error('Error loading books:', error);
//         const grid = document.getElementById('booksGrid') || document.querySelector('.books-grid');
//         if (grid) {
//             grid.innerHTML = 
//                 '<div class="empty-state"><h2>Unable to load books</h2><p>Please check your connection and try again.</p></div>';
//         }
//     }
// }
async function loadBooks() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) throw new Error('Failed to load books');

        allBooks = await response.json();

        // Assign unique ID if it doesn't exist
        allBooks = allBooks.map((book, i) => ({
            ...book,
            _id: book._id ?? `book-${i+1}` // string id
        }));

        filteredBooks = [...allBooks];

        populateFilters();
        applyFilters();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading books:', error);
        const grid = document.getElementById('booksGrid') || document.querySelector('.books-grid');
        if (grid) {
            grid.innerHTML =
                '<div class="empty-state"><h2>Unable to load books</h2><p>Please check your connection and try again.</p></div>';
        }
    }
}


// Helper to normalize fields from both old and new schemas
function getYearRead(book) {
    const yr = book.year_read ?? book['year read'];
    if (yr === undefined || yr === null) return '';
    return String(yr);
}

function getPublishedYear(book) {
    const py = book.published_year ?? book['published year'];
    if (py === undefined || py === null) return 0;
    return Number.isFinite(py) ? py : parseInt(py) || 0;
}

function getOrder(book) {
    const ord = book.order;
    if (ord === undefined || ord === null) return 0;
    return Number.isFinite(ord) ? ord : parseInt(ord) || 0;
}

// Populate filter dropdowns
function populateFilters() {
    const yearFilter = document.getElementById('yearFilter');
    const genreFilter = document.getElementById('genreFilter');
    
    // Get unique years and genres from normalized fields
    const years = [...new Set(
        allBooks
            .map(b => getYearRead(b).trim())
            .filter(Boolean)
    )].sort((a, b) => b - a);

    const genres = [...new Set(
        allBooks
            .map(book => (book.genre || '').trim())
            .filter(Boolean)
    )].sort();
    
    // Populate year filter
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    // Populate genre filter
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });
}

// Setup event listeners for search and filters
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const yearFilter = document.getElementById('yearFilter');
    const genreFilter = document.getElementById('genreFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
    
    yearFilter.addEventListener('change', applyFilters);
    genreFilter.addEventListener('change', applyFilters);
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        yearFilter.value = '';
        genreFilter.value = '';
        applyFilters();
    });
}

// Apply filters and search
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedYear = document.getElementById('yearFilter').value;
    const selectedGenre = document.getElementById('genreFilter').value;
    
    filteredBooks = allBooks.filter(book => {
        const title = (book.title || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        const yearRead = getYearRead(book);
        const genre = (book.genre || '');

        // Search filter
        const matchesSearch =
            !searchTerm ||
            title.includes(searchTerm) ||
            author.includes(searchTerm);
        
        // Year filter
        const matchesYear = !selectedYear || yearRead === selectedYear;
        
        // Genre filter
        const matchesGenre = !selectedGenre || genre === selectedGenre;
        
        return matchesSearch && matchesYear && matchesGenre;
    });
    
    displayBooks(filteredBooks);
    updateResultsCount();
}

// Update results count
function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    const count = filteredBooks.length;
    if (!resultsCount) return;
    if (count === allBooks.length) {
        resultsCount.textContent = '';
    } else {
        resultsCount.textContent = `Showing ${count} of ${allBooks.length} books`;
    }
}

// function displayBooks(books) {
//     const grid = document.getElementById('booksGrid') || document.querySelector('.books-grid');
    
//     if (!grid) return;

//     if (!books || books.length === 0) {
//         grid.innerHTML = '<div class="empty-state"><h2>No books found</h2><p>Try adjusting your filters or search terms.</p></div>';
//         return;
//     }

//     // Sort books by order (newest/highest first). Fallback: year_read/published year.
//     const sortedBooks = [...books].sort((a, b) => {
//         const orderA = getOrder(a);
//         const orderB = getOrder(b);
//         if (orderA !== orderB) {
//             return orderB - orderA; // higher order = newer
//         }

//         const yearA = parseInt(getYearRead(a)) || getPublishedYear(a);
//         const yearB = parseInt(getYearRead(b)) || getPublishedYear(b);
//         return yearB - yearA;
//     });

//     grid.innerHTML = sortedBooks.map((book, index) => {
//         const yearRead = getYearRead(book);
//         return `
//         <a href="book-detail.html?index=${index}" class="book-card-link">
//             <div class="book-card" data-book-index="${index}">
//                 <div class="book-cover">
//                     ${book.coverURL ? 
//                         `<img src="${escapeHtml(book.coverURL.replace('http://', 'https://'))}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${escapeHtml(book.title)}</span>';">` :
//                         `<span>${escapeHtml(book.title)}</span>`
//                     }
//                 </div>
//                 <div class="book-info">
//                     <div class="book-title">${escapeHtml(book.title)}</div>
//                     <div class="book-author">${escapeHtml(book.author || 'Unknown Author')}</div>
//                     ${yearRead ? `<div class="book-date">Read: ${escapeHtml(yearRead)}</div>` : ''}
//                 </div>
//             </div>
//         </a>
//         `;
//     }).join('');
// }

function displayBooks(books) {
    const grid = document.getElementById('booksGrid') || document.querySelector('.books-grid');
    if (!grid) return;

    if (!books || books.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h2>No books found</h2><p>Try adjusting your filters or search terms.</p></div>';
        return;
    }

    // Sort books by order or fallback
    const sortedBooks = [...books].sort((a, b) => {
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        if (orderA !== orderB) return orderB - orderA;
        const yearA = parseInt(getYearRead(a)) || getPublishedYear(a);
        const yearB = parseInt(getYearRead(b)) || getPublishedYear(b);
        return yearB - yearA;
    });

    grid.innerHTML = sortedBooks.map(book => {
        const yearRead = getYearRead(book);
        return `
        <a href="book-detail.html?id=${book._id}" class="book-card-link">
            <div class="book-card">
                <div class="book-cover">
                    ${book.coverURL ?
                        `<img src="${escapeHtml(book.coverURL.replace('http://', 'https://'))}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${escapeHtml(book.title)}</span>';">` :
                        `<span>${escapeHtml(book.title)}</span>`
                    }
                </div>
                <div class="book-info">
                    <div class="book-title">${escapeHtml(book.title)}</div>
                    <div class="book-author">${escapeHtml(book.author || 'Unknown Author')}</div>
                    ${yearRead ? `<div class="book-date">Read: ${escapeHtml(yearRead)}</div>` : ''}
                </div>
            </div>
        </a>
        `;
    }).join('');
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load books when page loads
document.addEventListener('DOMContentLoaded', loadBooks);

