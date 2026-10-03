# Lens-e Uthsob 2.0 judging portal

React + Vite, a small server API, Supabase Auth/database/private Storage, and Vercel hosting.

For step-by-step dashboard instructions, see [SUPABASE-SETUP.md](SUPABASE-SETUP.md).

## Run locally

```powershell
npm install
npm run prepare:photos
npm run dev
```

Open http://127.0.0.1:5173. This workspace is connected to live Supabase with 192 entries, 290 viewing photographs, and six judge accounts. Judges sign in at `/judge/login` using the email and four-digit PIN in the private `Judge login.txt` file. This file and `.env.local` are excluded from Git.

Preview is disabled by default and whenever Supabase is configured. For isolated development without Supabase, explicitly set `ALLOW_LOCAL_PREVIEW=true`; preview scores are in memory only. Preview is disabled in production, and local catalog/photos are removed from the production build.

## Connect live judging

1. Create a Supabase project and run `supabase/schema.sql` once in its SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL, anon/publishable client key, and server service-role key. The service-role key must stay server-side.
3. Create the admin email/password account in Supabase Authentication. Run `npm run create:admin` to grant that existing user admin access, or run the commented SQL at the end of the schema.
4. Resolve warnings from photo preparation, then run `npm run import:entries`. Repeat imports retain the entry IDs and scores. Optional Excel files can supply authoritative names and titles:

   ```powershell
   npm run import:entries -- --mobile "mobile.xlsx" --device "device.xlsx" --story "story.xlsx"
   ```

5. Restart `npm run dev`. Add judges through `/admin/login` with a username or email and four-digit PIN, or run `npm run import:judges` to import the private `Judge login.txt` file. Its format is three lines per judge: name, `email: address`, and `PIN: four digits`. Importing again verifies existing accounts without resetting their PINs.

The supplied workspace has photos but no Excel workbooks. Entry names/titles initially come from filenames and story folder names; some long titles were already truncated in the source filenames. Use the original workbooks or admin entry editing to restore them.

## Photo preparation

Original source files are preserved. Preview JPEGs are generated at up to 1,800 pixels with correct orientation and no stretching. HEIC files (including files incorrectly named `.jpg`) are detected by content and converted to browser-compatible JPEG. Full-resolution JPEG conversions are uploaded for HEIC originals; other original formats are retained. The private `photos` bucket serves signed URLs to authenticated judges/admins. URLs refresh during long sessions.

The preparation script writes its report to `data/import-manifest.json`. Live imports stop when stories are missing images, contain duplicate image sets, or lack a verifiable sequence. For filenames without sequence numbers, create `data/story-order.json` with the exact filenames in the intended order, for example:

```json
{ "S-013": ["first-original-filename.jpg", "second-original-filename.jpg"] }
```

Provide every filename for that story. Preview ordering for unverified stories is temporary and must be confirmed before the live import.

To add entry records while leaving specified stories unavailable for judging, pass `--pending-stories=S-004,S-013`. Their photographs are excluded until the order is confirmed. To upload only the high-quality viewing copies and preserve originals locally, pass `--preview-only`:

```powershell
npm run import:entries -- --preview-only --pending-stories=S-004,S-013
```

Photo preparation checks source content hashes so replaced source files refresh their previews even if their original timestamps are older.

## Behavior

- Scores accept 0–10 with up to two decimal places. Zero counts as completed. Clearing the score removes completion but retains optional remarks.
- Scores and remarks debounce for 450 ms, then save through a serialized upsert queue. Navigation does not discard pending saves. Failed requests retry with backoff; unsent live drafts are temporarily retained on the judge's device and recovered on the next login. Progress counts acknowledged saves only.
- Continue Judging opens the first unscored entry. Arrow navigation is disabled while typing; Enter in the score input moves to the next entry.
- Story photographs display in sequence, with one score and remark per story. Entries without images cannot be scored.
- Admin results show all judge scores and remarks. Averages use submitted scores, and incomplete results remain marked. CSV exports follow current filtering and contain individual remarks, completion counts, and averages.
- Judge PINs use salted scrypt hashes. Judge sessions last seven days in HttpOnly cookies; only token hashes are stored. Disabling a judge or resetting a PIN revokes sessions. Login attempts are limited in the database.
- All data tables have RLS enabled with browser access revoked. Server endpoints enforce judge ownership or verify a Supabase Auth token plus the explicit admin allowlist. Judge APIs never return other judges' scores, averages, or PIN hashes.

## Verify

```powershell
npm test
npm run build
# With npm run dev running and Chrome installed:
npx playwright test
# Optional live check: creates and then removes its own temporary judge and score.
node --env-file=.env.local scripts/check-backend.mjs
```

Security tests cover PIN hashing, score limits, anonymous access, same-origin writes, and forged judge IDs. Browser tests cover scoring/navigation, zero scores, story sequences, protected routes, results search/export, and mobile layout.

## Deploy to Vercel

Import this project into Vercel with the Vite preset. `vercel.json` configures the API and SPA routes. Add the Supabase variables from `.env.example` to the production environment; set `APP_ORIGIN` to the exact production origin with no trailing slash. Set `NODE_ENV=production` if it is not already set by the runtime. The live Supabase database is connected; hosting deployment is still a separate step. Never upload `Judge login.txt` or `.env.local` to Git.

Before the event, test real judge isolation, reconnecting after an interrupted save, PIN resets, admin export, and image loading against your configured Supabase project.
