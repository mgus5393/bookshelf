# Bookshelf Gallery

A static website to display a collection of books read, hosted on GitHub Pages with Netlify Functions for book management.

## Structure

- `index.html` - Public gallery page displaying all books
- `add.html` - Page to search and add new books via Google Books API
- `books.json` - JSON file storing all book data
- `netlify/functions/` - Netlify Functions for handling book saves

## Setup

1. Configure Netlify environment variables:
   - `GITHUB_TOKEN` - Personal access token with repo permissions
   - `GITHUB_REPO` - Repository name (e.g., "username/bookshelf")
   - `GITHUB_OWNER` - GitHub username

2. Deploy to Netlify or use GitHub Pages with Netlify Functions
