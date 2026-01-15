// Load book details from URL parameter
async function loadBookDetail() {
    try {
        // Get book index from URL
        const urlParams = new URLSearchParams(window.location.search);
        const indexParam = urlParams.get('index');
        
        if (indexParam === null) {
            showError('No book specified');
            return;
        }
        
        // Load all books
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error('Failed to load books');
        }
        const allBooks = await response.json();
        
        // Sort books the same way as gallery
        const sortedBooks = [...allBooks].sort((a, b) => {
            const yearA = a.year_read ? parseInt(a.year_read) : (a.published_year || 0);
            const yearB = b.year_read ? parseInt(b.year_read) : (b.published_year || 0);
            return yearB - yearA;
        });
        
        const index = parseInt(indexParam);
        if (isNaN(index) || index < 0 || index >= sortedBooks.length) {
            showError('Invalid book index');
            return;
        }
        
        const book = sortedBooks[index];
        displayBookDetail(book);
    } catch (error) {
        console.error('Error loading book detail:', error);
        showError('Failed to load book details');
    }
}

function displayBookDetail(book) {
    const container = document.getElementById('bookDetail');
    
    const coverImage = book.coverURL 
        ? book.coverURL.replace('http://', 'https://')
        : null;
    
    container.innerHTML = `
        <div class="book-detail">
            <div class="book-detail-cover">
                ${coverImage ? 
                    `<img src="${escapeHtml(coverImage)}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-cover\\'>${escapeHtml(book.title)}</div>';">` :
                    `<div class="no-cover">${escapeHtml(book.title)}</div>`
                }
            </div>
            <div class="book-detail-info">
                <h1>${escapeHtml(book.title)}</h1>
                <h2 class="book-detail-author">${escapeHtml(book.author || 'Unknown Author')}</h2>
                
                <div class="book-detail-meta">
                    ${book.published_year ? `<div class="meta-item"><strong>Published:</strong> ${book.published_year}</div>` : ''}
                    ${book.genre ? `<div class="meta-item"><strong>Genre:</strong> ${book.genre}</div>` : ''}
                    ${book.year_read ? `<div class="meta-item"><strong>Year Read:</strong> ${book.year_read}</div>` : ''}
                    ${book.rating ? `<div class="meta-item"><strong>Rating:</strong> ⭐ ${book.rating}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function showError(message) {
    const container = document.getElementById('bookDetail');
    container.innerHTML = `
        <div class="empty-state">
            <h2>${escapeHtml(message)}</h2>
            <p><a href="index.html">Return to Gallery</a></p>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load book detail when page loads
document.addEventListener('DOMContentLoaded', loadBookDetail);
