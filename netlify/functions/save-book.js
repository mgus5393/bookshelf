// Netlify Function to save a book by committing to GitHub repo
exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the book data from request body
        const bookData = JSON.parse(event.body);

        // Validate required fields
        if (!bookData.title || !bookData.author) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Title and author are required' })
            };
        }

        // Get environment variables
        const githubToken = process.env.GITHUB_TOKEN;
        const githubOwner = process.env.GITHUB_OWNER;
        const githubRepo = process.env.GITHUB_REPO;

        if (!githubToken || !githubOwner || !githubRepo) {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Server configuration error. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.' 
                })
            };
        }

        // Fetch current books.json from GitHub
        const getFileResponse = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/books.json`,
            {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Bookshelf-App'
                }
            }
        );

        let currentBooks = [];
        let sha = null;

        if (getFileResponse.ok) {
            const fileData = await getFileResponse.json();
            sha = fileData.sha;
            // Decode base64 content
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            currentBooks = JSON.parse(content);
        } else if (getFileResponse.status === 404) {
            // File doesn't exist yet, start with empty array
            currentBooks = [];
        } else {
            throw new Error(`Failed to fetch books.json: ${getFileResponse.statusText}`);
        }

        // Determine next order value (1 higher than current max)
        let maxOrder = 0;
        for (const b of currentBooks) {
            const raw = b.order;
            const ord = Number.isFinite(raw) ? raw : parseInt(raw) || 0;
            if (ord > maxOrder) {
                maxOrder = ord;
            }
        }

        if (!bookData.order) {
            bookData.order = maxOrder + 1;
        }
        
        // Add new book
        currentBooks.push(bookData);

        // Encode content to base64
        const newContent = Buffer.from(JSON.stringify(currentBooks, null, 2)).toString('base64');

        // Commit to GitHub
        const commitMessage = `Add book: ${bookData.title} by ${bookData.author}`;
        
        const commitResponse = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/books.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Bookshelf-App'
                },
                body: JSON.stringify({
                    message: commitMessage,
                    content: newContent,
                    sha: sha // Required if updating existing file
                })
            }
        );

        if (!commitResponse.ok) {
            const errorData = await commitResponse.json();
            throw new Error(`Failed to commit: ${errorData.message || commitResponse.statusText}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                message: 'Book added successfully',
                book: bookData
            })
        };

    } catch (error) {
        console.error('Error saving book:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message || 'Failed to save book' 
            })
        };
    }
};
