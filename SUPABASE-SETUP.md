# Supabase setup for the judging portal

Follow these steps in order. You only need one Supabase project.

**Current status:** This workspace is connected to Supabase. All 192 entries, 290 viewing photographs, and six judge accounts have been imported. Start `npm run dev`, then use the email and PIN from your private `Judge login.txt` at http://127.0.0.1:5173/judge/login. Do not recreate the existing judges or rerun the schema.

## 1. Create the project

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project** and select your organization.
3. Name it `Lens-e Uthsob Judging`.
4. Choose a strong database password and save it somewhere private. This is separate from your portal admin password.
5. Choose a region near Bangladesh, such as Singapore if available.
6. Create the project and wait until it is ready.

## 2. Create the database tables

1. In your project, open **SQL Editor** and start a new query.
2. Open [supabase/schema.sql](supabase/schema.sql) from this project folder.
3. Copy the entire file into the SQL Editor and click **Run**.

Run this setup file only once on the new project. If it succeeds, **Table Editor** should show these seven tables:

`admin_users`, `judges`, `entries`, `story_images`, `scores`, `judge_sessions`, and `login_limits`.

The script also sets up access protection and creates a private Storage bucket named `photos`.

## 3. Connect the portal to Supabase

Open the project's **Connect** dialog to find its **Project URL** and **Publishable key**. Find the **Secret key** under **Settings → API Keys**; create one there if needed. These locations and key types are explained in [Supabase's API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

In the portal's main folder, make a copy of `.env.example` named `.env.local`. Fill it in like this, replacing the example values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_KEY
APP_ORIGIN=http://127.0.0.1:5173
```

Use the same Project URL on both URL lines. Keep the variable names exactly as shown: this portal uses `VITE_SUPABASE_ANON_KEY` for the publishable key and `SUPABASE_SERVICE_ROLE_KEY` for the secret key. If you already use legacy keys, `anon` and `service_role` respectively also work. Keep the secret key in `.env.local`; do not paste it into chat or a `VITE_` variable. [Supabase key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

## 4. Create your admin login

1. In Supabase, go to **Authentication → Users**.
2. Choose **Add user → Create new user** (the button may be labelled **New user**).
3. Enter your admin email and a strong password.
4. Enable **Auto Confirm User**, if shown, so the account can sign in immediately.
5. Create the user.

This is the email and password you will use at the portal's `/admin/login` page. Dashboard user creation is described in this [Supabase Auth issue](https://github.com/supabase/auth/issues/1226).

Now give that account permission to use the admin dashboard. Open a new SQL Editor query and run the following, replacing `your-email@example.com` with the email you just used:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('your-email@example.com')
on conflict (user_id) do nothing
returning user_id;
```

On the first run, this should return one user ID. You can also check that **Table Editor → admin_users** contains that ID. Creating the Auth user alone does not grant admin access.

## 5. Check photo storage

Open **Storage**. You should see the `photos` bucket created in step 2. Keep it **private**; the portal generates temporary viewing links after login. You do not need to manually create folders or add public-access policies. [Supabase private bucket guide](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## 6. Start the portal and manage judges

Open a terminal in the project folder:

```powershell
npm run dev
```

If it is already running, stop it with **Ctrl+C**, then run the command again so it picks up `.env.local`.

1. Open http://127.0.0.1:5173/admin/login.
2. Sign in with the admin email/password from step 4.
3. Open **Judges → Add judge**.
4. For a first test account, enter:

   - Name: `Test Judge`
   - Username or email: `testjudge`
   - PIN: `4821`

5. Click **Create judge**.

Once created, you can use `testjudge` / `4821` at http://127.0.0.1:5173/judge/login. Judge accounts are created in the portal, not in Supabase Authentication. Their PINs are hashed automatically.

Your six real accounts from `Judge login.txt` are already created. To import that private file into another configured project, run `npm run import:judges`. Existing accounts are verified, not overwritten. PINs are stored as salted hashes; the private file is excluded from Git.

## 7. Upload the entries and photographs

The initial import is complete: 192 entries and 290 viewing photographs are already in Supabase. The story issues are resolved, with the existing order of Stories 04 and 13 retained as instructed. See [SOURCE-REVIEW.md](SOURCE-REVIEW.md).

For a future update using viewing copies, run these commands in order:

```powershell
npm run prepare:photos
npm run import:entries -- --preview-only
```

The import script uploads viewing photographs into the private bucket and updates entries while retaining their IDs and scores. Full-resolution originals stay local when `--preview-only` is used. The portal has **117 Mobile entries, 60 Device entries, and 15 Story entries**.

## 8. Check one real score

1. Sign in at `/judge/login` using one of your real judge accounts (or a separate test account).
2. Open Mobile and give the first photograph a score such as `8.5`.
3. Wait for **Saved**, then refresh the page and confirm the score remains.
4. Sign in as admin at `/admin/login`, open **Results**, and check the judge's score.

Real judges are already available. Add or manage future accounts from the admin dashboard.

## Later: Vercel

When deploying, add the same environment variables in Vercel. Change `APP_ORIGIN` to the exact website origin, such as `https://your-portal.vercel.app`, with no trailing slash. Keep the Supabase URL and keys the same.

## If something does not work

- **The portal is not connected:** Check all four Supabase variables in `.env.local` and restart `npm run dev`. Live mode does not offer preview login.
- **Admin has no permission:** Check the email in step 4 and the corresponding row in `admin_users`.
- **Request origin is not allowed:** Open the portal at `http://127.0.0.1:5173`, matching `APP_ORIGIN`, rather than `http://localhost:5173`.
- **Import reports story warnings:** Resolve the photo issues in step 7 and prepare the photos again.
