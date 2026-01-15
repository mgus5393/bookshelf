// Global state
let allBooks = [];
let filteredBooks = [];

// Load and display books
async function loadBooks() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error('Failed to load books');
        }
        allBooks = await response.json();
        filteredBooks = [...allBooks];
        
        populateFilters();
        displayBooks(filteredBooks);
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

// Populate filter dropdowns
function populateFilters() {
    const yearFilter = document.getElementById('yearFilter');
    const genreFilter = document.getElementById('genreFilter');
    
    // Get unique years and genres
    const years = [...new Set(allBooks.map(book => book.year_read).filter(y => y && y.trim()))].sort((a, b) => b - a);
    const genres = [...new Set(allBooks.map(book => book.genre).filter(g => g && g.trim()))].sort();
    
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
    
    searchInput.addEventListener('input', (e) => {
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
        // Search filter
        const matchesSearch = !searchTerm || 
            book.title.toLowerCase().includes(searchTerm) ||
            (book.author && book.author.toLowerCase().includes(searchTerm));
        
        // Year filter
        const matchesYear = !selectedYear || book.year_read === selectedYear;
        
        // Genre filter
        const matchesGenre = !selectedGenre || book.genre === selectedGenre;
        
        return matchesSearch && matchesYear && matchesGenre;
    });
    
    displayBooks(filteredBooks);
    updateResultsCount();
}

// Update results count
function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    const count = filteredBooks.length;
    if (count === allBooks.length) {
        resultsCount.textContent = '';
    } else {
        resultsCount.textContent = `Showing ${count} of ${allBooks.length} books`;
    }
}

function displayBooks(books) {
    const grid = document.getElementById('booksGrid') || document.querySelector('.books-grid');
    
    if (!books || books.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h2>No books found</h2><p>Try adjusting your filters or search terms.</p></div>';
        return;
    }

    // Sort books by year_read (newest first), then by published_year
    const sortedBooks = [...books].sort((a, b) => {
        const yearA = a.year_read ? parseInt(a.year_read) : (a.published_year || 0);
        const yearB = b.year_read ? parseInt(b.year_read) : (b.published_year || 0);
        return yearB - yearA;
    });

    grid.innerHTML = sortedBooks.map((book, index) => {
        return `
        <a href="book-detail.html?index=${index}" class="book-card-link">
            <div class="book-card" data-book-index="${index}">
                <div class="book-cover">
                    ${book.coverURL ? 
                        `<img src="${escapeHtml(book.coverURL.replace('http://', 'https://'))}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${escapeHtml(book.title)}</span>';">` :
                        `<span>${escapeHtml(book.title)}</span>`
                    }
                </div>
                <div class="book-info">
                    <div class="book-title">${escapeHtml(book.title)}</div>
                    <div class="book-author">${escapeHtml(book.author || 'Unknown Author')}</div>
                    ${book.year_read ? `<div class="book-date">Read: ${book.year_read}</div>` : ''}
                    ${book.rating ? `<div class="book-rating">⭐ ${book.rating}</div>` : ''}
                </div>
            </div>
        </a>
        `;
    }).join('');

    // Store book data for detail page navigation
    window.sortedBooks = sortedBooks;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load books when page loads
document.addEventListener('DOMContentLoaded', loadBooks);
