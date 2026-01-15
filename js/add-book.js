const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

let searchTimeout;

// Handle search input
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(() => {
        searchBooks(query);
    }, 500);
});

// Handle search button click
document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        searchBooks(query);
    }
});

// Search Google Books API
async function searchBooks(query) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

    try {
        const response = await fetch(`${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=20`);
        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();
        displaySearchResults(data.items || []);
    } catch (error) {
        console.error('Error searching books:', error);
        resultsContainer.innerHTML = '<div class="error">Failed to search books. Please try again.</div>';
    }
}

// Store search results for event delegation
let currentSearchResults = [];

// Display search results
function displaySearchResults(books) {
    const resultsContainer = document.getElementById('searchResults');
    currentSearchResults = books; // Store for event delegation

    if (books.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state"><h2>No books found</h2><p>Try a different search term.</p></div>';
        return;
    }

    resultsContainer.innerHTML = books.map((book, index) => {
        const volumeInfo = book.volumeInfo;
        const coverImage = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '';
        const title = volumeInfo.title || 'Unknown Title';
        const authors = volumeInfo.authors?.join(', ') || 'Unknown Author';
        const description = volumeInfo.description || '';
        const publishedDate = volumeInfo.publishedDate || '';

        return `
            <div class="search-result-item">
                <img src="${coverImage || ''}" alt="${escapeHtml(title)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23667eea%22 width=%22100%22 height=%22150%22/%3E%3Ctext fill=%22white%22 font-size=%2212%22 x=%2250%22 y=%2275%22 text-anchor=%22middle%22%3E${escapeHtml(title.substring(0, 20))}%3C/text%3E%3C/svg%3E';">
                <div class="search-result-info">
                    <h3>${escapeHtml(title)}</h3>
                    <p><strong>Author:</strong> ${escapeHtml(authors)}</p>
                    ${publishedDate ? `<p><strong>Published:</strong> ${publishedDate}</p>` : ''}
                    ${description ? `<p>${escapeHtml(description.substring(0, 150))}...</p>` : ''}
                    <button class="add-book-btn" data-book-index="${index}">
                        Add Book
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners to all add buttons using event delegation
    resultsContainer.querySelectorAll('.add-book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-book-index'));
            const book = currentSearchResults[index];
            const volumeInfo = book.volumeInfo;
            const coverImage = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '';
            
            const bookData = {
                title: volumeInfo.title || 'Unknown Title',
                author: volumeInfo.authors?.join(', ') || 'Unknown Author',
                coverImage: coverImage.replace('http://', 'https://'),
                description: volumeInfo.description || '',
                publishedDate: volumeInfo.publishedDate || '',
                googleBooksId: book.id
            };
            
            addBook(bookData);
        });
    });
}

// Add book to collection
async function addBook(bookData) {
    // Get date finished from user
    const dateFinished = prompt('Enter the date you finished reading this book (YYYY-MM-DD) or leave blank:', 
        new Date().toISOString().split('T')[0]);
    
    if (dateFinished === null) {
        return; // User cancelled
    }

    const bookToSave = {
        ...bookData,
        dateFinished: dateFinished || new Date().toISOString().split('T')[0],
        addedAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/.netlify/functions/save-book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookToSave)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Book added successfully!', 'success');
            // Clear search after a moment
            setTimeout(() => {
                document.getElementById('searchInput').value = '';
                document.getElementById('searchResults').innerHTML = '';
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to save book');
        }
    } catch (error) {
        console.error('Error adding book:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.search-container');
    const firstChild = container.firstElementChild;
    container.insertBefore(messageDiv, firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
