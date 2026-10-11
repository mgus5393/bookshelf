# Verification

Run `node --test tests/*.test.mjs` after installing the dependency. The suite covers:

- All 178 original books and stable IDs, including mixed legacy field names.
- Public reading, authenticated mutations, wrong passwords, tampered/expired
  cookies, password rotation, missing configuration, and cross-origin rejection.
- Add/read/edit/remove; no duplicate records on retries; intentional rereads in
  another year; stale-edit conflicts and simultaneous first-save races.
- Invalid input and storage outages, without silently resetting the collection.
- Catalog fallback and manual saving during search outages.
- Actual Netlify Blobs SDK read/write/conditional-update behavior against its local
  storage server (not just a mocked store).

`node scripts/build.mjs` produces `dist/` and deployment-context metadata. On
Netlify, Production selects `bookshelf-v1`; previews use isolated stores.

## Browser checks

Use `node scripts/dev.mjs`; test data lives only under `.local-data/`.

1. Gallery loads the original books; title/author, year, and genre filters combine.
2. Open a filtered book and verify the correct details, not a positional index.
3. Unlock editing. Add a book manually, follow its detail link, edit its note,
   and verify changes after refresh. Check a second browser with no login.
4. Search, select a catalog result, review fields, and add. If catalog requests
   are blocked/unavailable, verify the manual-entry route and helpful message.
5. Failed saves retain fields; unauthorized saves return to unlock without losing
   the form. Locking hides editing. Visitors cannot mutate through direct API calls.
6. Verify narrow/mobile layouts and keyboard-accessible labels/buttons.
7. Download the JSON backup and verify it includes new edits.

## Production-only verification

Local tests cannot verify account configuration, current billing plan, production
storage permissions, Netlify's applied rate limits, HTTPS cookies, or whether the
old remote database has extra books. Follow the deployment checklist in README.
After first deployment, add/edit from one device and browse from another, then
redeploy and confirm the changes persist. Keep a backup before any migration.
