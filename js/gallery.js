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

    // Sort books by date finished (newest first)
    const sortedBooks = [...books].sort((a, b) => {
        const dateA = new Date(a.dateFinished || 0);
        const dateB = new Date(b.dateFinished || 0);
        return dateB - dateA;
    });

    grid.innerHTML = sortedBooks.map((book, index) => `
        <div class="book-card" data-book-index="${index}">
            <div class="book-cover">
                ${book.coverImage ? 
                    `<img src="${escapeHtml(book.coverImage)}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${escapeHtml(book.title)}</span>';">` :
                    `<span>${escapeHtml(book.title)}</span>`
                }
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-author">${escapeHtml(book.author || 'Unknown Author')}</div>
                ${book.dateFinished ? `<div class="book-date">Finished: ${formatDate(book.dateFinished)}</div>` : ''}
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
${book.dateFinished ? `Finished: ${formatDate(book.dateFinished)}\n` : ''}
${book.description ? `\nDescription:\n${book.description.substring(0, 200)}...` : ''}
    `.trim();
    
    alert(details);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load books when page loads
document.addEventListener('DOMContentLoaded', loadBooks);
