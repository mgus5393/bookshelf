# The Bookshelf

A small, shared reading collection. Anyone with the URL can browse. You and your
wife unlock editing with one password, search for a book or enter it by hand, and
save. Changes appear immediately on other devices when they open or refresh the
shelf. The computer used to develop it does not need to stay on.

## One-time publishing setup

1. Sign into your **Netlify Free** account. If you already have a bookshelf site,
   open that project so you keep its URL. Otherwise, import this private GitHub
   repository as a new project. Authorize the GitHub account that owns this repo;
   the repository itself can stay private. A personal repo is the intended setup.
2. Before replacing an existing site, compare its collection with the 178 books in
   `books.json`. The previous Supabase URL did not resolve during the review. If
   Supabase still contains additional or corrected books, export and reconcile
   those before the first production save. **Do not delete the old database.**
3. Add a Netlify environment variable named `BOOKSHELF_PASSWORD`, available to
   **Functions** in the **Production** context. Use a unique passphrase of at least
   16 characters (several random words work well). Enter it directly in Netlify;
   never put it in the repository. If scopes are not offered, use all scopes.
4. Deploy the production branch with these settings (already in `netlify.toml`):
   - Base directory: repository root
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
   - Node: 22; package manager is pinned in `package.json`
5. Open the assigned **HTTPS `*.netlify.app` URL**. No purchased domain is needed.
   Check that the collection shows 178 books (or the reconciled count). Open
   **Add a book**, enter your password, and test a real addition.
6. Open the same URL on another device without signing in. Verify that the new
   book and its details appear. Check the Netlify deploy log for accepted function
   rate-limit rules. The hosted storage, authentication cookie, and deployment
   must be verified here; local testing is not proof of a production deployment.

Use a Git-connected deployment, not static drag-and-drop publishing. The API
functions are required. GitHub Pages alone cannot run this version.

If the site is already deployed, commit/push these changes to its configured
branch when ready. The one-time password setting and initial deployment are the
only setup your family needs. Future books are added through the website.

## Staying free

As checked October 10, 2026, Netlify's current Free plan has 300 monthly credits
and a hard limit. If exhausted, projects pause rather than incur overage charges.
Usage is shared by projects on the team; other projects can affect this site.
Existing older accounts may have a legacy plan: verify the actual plan in Billing.
Keep the account on Free, do not enable paid upgrades, and use the included domain.
A small family bookshelf is a reasonable fit, but free hosting is not an unlimited
uptime guarantee. Avoid unnecessary production deploys; adding books does not deploy.

References: [Netlify plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/),
[Blobs storage](https://docs.netlify.com/build/data-and-storage/netlify-blobs/),
[rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

## Everyday use

- Browse/search/filter the collection without logging in.
- Choose **Add a book**, unlock once per browser for 30 days, search by title,
  author, or ISBN, choose a result, check it, and save.
- Search fills in details using Open Library, with Google Books as a fallback.
  No API keys are needed. If both catalogs are unavailable, manual entry still
  works. Only title and author are required. Covers and notes are optional.
- Open any book to edit its details. Unlocked browsers can remove books after a
  confirmation. Read the removal confirmation carefully: there is no trash folder.
- A title/author/year combination cannot be added twice accidentally. Reading the
  same book in another year is supported. A repeated read within one year can be
  described in its note.
- Notes are public with the shelf. The site requests that search engines not
  index it, but the URL is **not** an access-control secret: anyone can share it.
- Use **Download book list** regularly for a portable JSON backup.
- Choose **Lock editing** on shared devices. Rotating `BOOKSHELF_PASSWORD` in
  Netlify and redeploying invalidates all previous login cookies.

## Where the books live

`books.json` is an unchanged seed/backup of the original 178 books. On a new site,
public reads display that seed. The first successful write atomically persists
the entire collection in a site-wide Netlify Blobs store, `bookshelf-v1`, under the
key `collection`. From then on that store is authoritative. Redeploys do not reset
books. Changing `books.json` after the first save does not change the live shelf.

Production and deploy previews use different store names. The build script bakes
the deployment context into the function bundle; preview saves cannot change
production books. Preview stores start with the seed, not production changes.
Only provide an editing password to preview contexts if you actually want to edit
test data there. Local preview uses `.local-data/` and cannot change production.

Deleting/recreating the Netlify project does **not** move stored books. Export
before moving hosts. To restore a backup on an existing site, use the authenticated
Netlify Blobs tooling to replace the `collection` JSON in `bookshelf-v1` after
validating IDs/schema and backing up current data. To move to a new, empty site,
use the export as its `books.json` seed before the first save. Do not clear a live
store just to trigger seeding.

## Local development

Install Node 22 or newer. The simplest preview requires no dependencies:

```powershell
cd C:\Users\Matt\Documents\Personal\Bookshelf\bookshelf
node scripts/dev.mjs
```

Open `http://127.0.0.1:8888`. The terminal prints a random temporary password for
this local session. This is not your production password. Local writes survive a
server restart in `.local-data/collection.json` (ignored by Git).

For dependency installation and all tests, use Corepack/pnpm if available:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
```

Alternatively `npm install`, `npm test`, and `npm run build` work with Node's npm.
Netlify uses the checked-in pnpm lockfile for reproducible installs. A plain
Python/static HTTP server cannot serve the API and is not a full preview.

## What changed from the old project

The gallery previously read Supabase, detail pages read `books.json`, and a legacy
save function committed to GitHub. The add script called Supabase without loading
its client. The current app uses one same-origin API and one durable collection.
It removes runtime Supabase and GitHub credentials, adds server-side editing
authentication, validates input, safely renders book text, and guards concurrent
writes with conditional storage updates. The publish directory contains only web
assets, not server source, package metadata, tests, or secrets.

Once migration and the new deployment are verified, the obsolete Netlify
`GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` variables can be removed, and a
token dedicated to the old save function can be revoked. Do not revoke a token
used by other projects. Keep the old service/data until migration is confirmed.

## Reading wait list

Use **Wait list** in the navigation for books to read later. Browse without signing in; use the existing editing password to add, edit, or remove entries. The same catalog search and manual-entry form are available. Wait-list entries live under a separate `waitlist` key in the same durable store and do not affect finished books or their reading order. Removal asks for confirmation. Local development also keeps each list in its own file.
