// Load and display books
async function loadBooks() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error('Failed to load books');
        }
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
        document.querySelector('.books-grid').innerHTML = 
            '<div class="empty-state"><h2>Unable to load books</h2><p>Please check your connection and try again.</p></div>';
    }
}

function displayBooks(books) {
    const grid = document.querySelector('.books-grid');
    
    if (!books || books.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h2>No books yet</h2><p>Start adding books to see them here!</p></div>';
        return;
    }

    // Sort books by year_read (newest first), then by published_year
    const sortedBooks = [...books].sort((a, b) => {
        const yearA = a.year_read ? parseInt(a.year_read) : (a.published_year || 0);
        const yearB = b.year_read ? parseInt(b.year_read) : (b.published_year || 0);
        return yearB - yearA;
    });

    grid.innerHTML = sortedBooks.map((book, index) => `
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
    `).join('');

    // Add click handlers to book cards
    grid.querySelectorAll('.book-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            showBookDetails(sortedBooks[index]);
        });
    });
}

function showBookDetails(book) {
    const details = `
Title: ${book.title}\n
Author: ${book.author || 'Unknown'}\n
${book.published_year ? `Published: ${book.published_year}\n` : ''}
${book.genre ? `Genre: ${book.genre}\n` : ''}
${book.year_read ? `Year Read: ${book.year_read}\n` : ''}
${book.rating ? `Rating: ⭐ ${book.rating}\n` : ''}
    `.trim();
    
    alert(details);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load books when page loads
document.addEventListener('DOMContentLoaded', loadBooks);
