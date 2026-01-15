# Testing Guide

## Quick Local Test (Before Netlify)

### Option 1: Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open: http://localhost:8000

### Option 2: Node.js HTTP Server
```bash
npx http-server -p 8000
```
Then open: http://localhost:8000

### Option 3: VS Code Live Server
- Install "Live Server" extension
- Right-click on `index.html` → "Open with Live Server"

## What to Test

### 1. Gallery Page (index.html)
- ✅ Should load and display all books from `books.json`
- ✅ Books should show covers, titles, authors
- ✅ Books with `year_read` should show "Read: [year]"
- ✅ Books with `rating` should show star rating
- ✅ Clicking a book should show details popup
- ✅ Should be responsive on mobile

### 2. Add Book Page (add.html)
- ✅ Search box should work (try searching for "Harry Potter")
- ✅ Results should show book covers and details
- ✅ Clicking "Add Book" should prompt for:
  - Year read (YYYY format)
  - Rating (1-5, optional)
- ✅ After adding, should show success message

### 3. Netlify Function Test
**Important:** The add book function will only work on Netlify (not locally)

To test the function:
1. Deploy to Netlify
2. Make sure environment variables are set:
   - `GITHUB_TOKEN` - Your GitHub personal access token
   - `GITHUB_OWNER` - Your GitHub username
   - `GITHUB_REPO` - Repository name (e.g., "bookshelf")
3. Try adding a book from the deployed site
4. Check GitHub repo to see if `books.json` was updated

## Common Issues

### Gallery not loading books
- Check browser console for errors (F12)
- Verify `books.json` is in the root directory
- Check that the JSON is valid (no syntax errors)

### Add book not working
- Check Netlify function logs (Netlify dashboard → Functions)
- Verify environment variables are set correctly
- Check that GitHub token has `repo` permissions
- Verify repository name matches exactly (case-sensitive)

### CORS errors
- This is normal when testing locally
- Netlify Functions should work fine on deployed site

## Next Steps After Testing

1. If gallery works locally → Deploy to Netlify
2. If add book works on Netlify → You're all set!
3. If issues → Check Netlify function logs and browser console
