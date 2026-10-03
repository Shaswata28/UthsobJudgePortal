# Lens-e Uthsob 2.0  
## Photography Judging Portal — Project Brief

Build a simple web portal for **Lens-e Uthsob 2.0 photography judging**.

The portal will replace the current Excel-based judging workflow and allow judges to review photos, submit scores, write optional remarks, track their progress, and continue judging later without losing their work.

---

# 1. Tech Stack

- **Frontend:** React + Vite
- **Backend / Database:** Supabase
- **Storage:** Supabase Storage
- **Hosting:** Vercel
- **Styling:** Simple, clean, responsive, minimal UI

The application should remain lightweight and should not be overengineered.

Priority should be given to:

- reliability
- fast image loading
- simple navigation
- autosaving
- clear judging progress
- preventing score loss

---

# 2. Users

The portal will initially have:

- **6 Judges**
- **1 Admin**

The Judge and Admin authentication systems should be separate.

---

# 3. Judge Authentication

Judges will use:

- **Username**
- **4-digit PIN**

Example:

Username: `imran`  
PIN: `4821`

Judge login route:

`/judge/login`

After successful login, redirect the judge to:

`/judge/dashboard`

The system must identify the logged-in judge so that every score and remark is automatically associated with that judge.

## Judge Permissions

Judges can:

- View the three photography categories
- View competition entries
- Give scores
- Write optional remarks
- Edit their own scores
- Edit their own remarks
- View their own judging progress
- Continue judging later
- Log out

Judges cannot:

- View another judge's score
- View another judge's remarks
- View average scores
- Access the Admin Dashboard
- Modify participant information
- Modify another judge's submission

Judge PINs must never be stored in plain text.

Store only a secure hash of the PIN.

---

# 4. Admin Authentication

Admin authentication should be stronger than judge authentication.

Use:

**Supabase Auth — Email + Password**

Admin login route:

`/admin/login`

Admin dashboard:

`/admin`

Only an authenticated admin should be able to access the Admin Dashboard.

The Admin should be able to:

- View all judges
- View judge progress
- View all submitted scores
- View all remarks
- View calculated averages
- Filter results by category
- Sort results
- Identify incomplete judging
- Export results
- Add judges
- Disable judges
- Reset judge PINs
- Edit entry information if required

---

# 5. Judge Dashboard

After login, show the Judge Dashboard.

Example:

**Welcome, Imran Hossain Khan**

### Mobile
35 / 117 completed

`Continue Judging`

### Device
22 / 60 completed

`Continue Judging`

### Story
8 / 15 completed

`Continue Judging`

### Overall Progress
65 / 192 completed

Also provide:

- Logout
- Progress percentage
- Completed / Remaining information

A judge should be able to leave the website and continue later.

---

# 6. Categories

There are three judging categories:

1. Mobile
2. Device
3. Story

Current selected entries:

- **Mobile:** 117 photos
- **Device:** 60 photos
- **Story:** 15 stories

Total:

**192 judging entries**

---

# 7. Mobile and Device Judging

For Mobile and Device, show **one photo at a time**.

The photo should occupy most of the viewing area.

Display:

- Serial
- Participant Name
- Photo Title
- Large Photo Preview

Example:

**M-050**

Shoikat Devnath Prottoy

**Hands That Harvest**

[Large Photo]

---

## Scoring

Judge gives:

**Score out of 10**

Decimal scores must be allowed.

Examples:

- 7
- 7.5
- 8
- 8.5
- 9.25
- 10

Score validation:

`0 <= score <= 10`

---

## Remarks

Provide an optional remarks box.

Example:

`Strong composition and subject placement. Highlights could be handled better.`

Remarks are not required.

---

# 8. Autosave

Scores and remarks should automatically save.

The judge should not need to manually press a Submit button after every photo.

When the judge changes:

- score
- remark

the system should autosave using an upsert operation.

Show a clear save state:

`Saving...`

then:

`✓ Saved`

If saving fails:

`Save failed — retrying`

Prevent accidental data loss.

---

# 9. Navigation

Provide:

`Previous`

`Next`

Also support keyboard navigation where practical:

- **Left Arrow:** Previous photo
- **Right Arrow:** Next photo

The interface should be optimized for judges reviewing many photos quickly.

---

# 10. Photo Navigation

Judges should also be able to understand where they are within a category.

Example:

`Photo 50 of 117`

Optional future improvement:

Allow a small photo index/grid so judges can jump to a specific entry.

Status could show:

- Judged
- Not Judged

Do not show scores from other judges.

---

# 11. Story Judging

Story entries contain multiple images.

Each Story submission should be evaluated as **one complete entry**.

Example:

**Story #05**

Participant: Zunaid Hasan

Title: **Fragments of Rest**

Display all photographs belonging to the Story together.

Example:

[Photo 1] [Photo 2] [Photo 3]

[Photo 4] [Photo 5] [Photo 6]

The original Story image sequence should be preserved.

---

## Story Score

Judge gives:

- One score out of 10 for the entire Story
- One optional remark for the Story

Example:

Score:

`8.5 / 10`

Remark:

`Strong sequence and visual consistency.`

Autosave should work exactly like Mobile and Device.

---

# 12. Admin Dashboard

The Admin Dashboard should provide a complete overview of judging.

Main sections:

- Overview
- Judge Progress
- Results
- Entries
- Judges

---

# 13. Admin Overview

Show:

### Entries

Mobile: 117  
Device: 60  
Story: 15  

Total: 192

### Judges

Judge 1: 192 / 192

Judge 2: 175 / 192

Judge 3: 143 / 192

Judge 4: 192 / 192

Judge 5: 180 / 192

Judge 6: 165 / 192

This makes it easy to identify incomplete judging.

---

# 14. Results Table

Admin should be able to view results in a table.

Example:

| Serial | Participant | Photo Title | J1 | J2 | J3 | J4 | J5 | J6 | Average |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| M-001 | Participant A | Photo A | 8.5 | 9 | 8 | 8.5 | 9 | 8 | 8.50 |
| M-002 | Participant B | Photo B | 7 | 8 | 7.5 | 8 | 8 | 7 | 7.58 |

Admin should be able to:

- Filter by category
- Sort by average score
- Sort by serial
- Search participant
- Search title
- Identify missing judge scores

---

# 15. Judge Remarks in Admin

Admin should also be able to inspect remarks from individual judges.

Example:

Photo: M-050

Judge 1:
`Strong composition.`

Judge 2:
`Good storytelling but slightly distracting background.`

Judge 3:
`No remark`

---

# 16. Export Results

Admin should be able to export judging data.

Minimum requirement:

- CSV export

Preferred:

- Excel export

Export should include:

- Serial
- Participant Name
- Photo Title
- Category
- Judge Names
- Individual Scores
- Average Score
- Remarks if needed

---

# 17. Database Schema

## judges

Fields:

- `id`
- `name`
- `username`
- `pin_hash`
- `active`
- `created_at`

Requirements:

- `username` must be unique
- Never store raw PIN
- `active` can disable judge access

Example:

| name | username |
|---|---|
| Imran Hossain Khan | imran |
| Judge Two | judge2 |

---

# 18. Admin Users

Admin authentication should use Supabase Auth.

Do not create a custom plain-text admin password table.

Supabase Auth should handle:

- admin email
- password
- session
- authentication

The system should verify that the authenticated Supabase user has Admin permission before allowing access to `/admin`.

---

# 19. Entries Table

## entries

Fields:

- `id`
- `serial`
- `participant_name`
- `title`
- `category`
- `image_url`
- `created_at`

Category values:

- `mobile`
- `device`
- `story`

For Mobile and Device:

`image_url` points to the photograph stored in Supabase Storage.

For Story entries, the primary entry record represents the Story.

---

# 20. Story Images Table

## story_images

Fields:

- `id`
- `entry_id`
- `image_url`
- `image_order`

Example:

| entry_id | image_url | image_order |
|---|---|---:|
| story_01 | image1.jpg | 1 |
| story_01 | image2.jpg | 2 |
| story_01 | image3.jpg | 3 |

Story photographs must display according to `image_order`.

---

# 21. Scores Table

## scores

Fields:

- `id`
- `judge_id`
- `entry_id`
- `score`
- `remark`
- `updated_at`

Add a unique constraint:

`judge_id + entry_id`

This ensures that each judge has only one score record per entry.

When autosaving:

Use upsert.

If the record already exists:

Update it.

If it does not exist:

Create it.

---

# 22. Judge Session System

After judge login:

1. Judge enters username.
2. Judge enters PIN.
3. Server verifies username.
4. Server compares entered PIN against `pin_hash`.
5. If valid, create a judge session.
6. Associate the session with that judge's ID.
7. Redirect to `/judge/dashboard`.

The application must not trust a `judge_id` sent directly from the browser when submitting a score.

The currently authenticated judge should determine the `judge_id`.

---

# 23. Logout

Judge logout should:

- Destroy the current judge session
- Remove local authentication state
- Redirect to:

`/judge/login`

Admin logout should use Supabase Auth logout.

---

# 24. Routes

## Public

`/`

Optional landing page.

`/judge/login`

Judge Login.

`/admin/login`

Admin Login.

---

## Judge Protected Routes

`/judge/dashboard`

`/judge/mobile`

`/judge/device`

`/judge/story`

If no judge session exists:

Redirect to:

`/judge/login`

---

## Admin Protected Routes

`/admin`

Possible child routes:

`/admin/results`

`/admin/judges`

`/admin/entries`

If no valid Admin Supabase session exists:

Redirect to:

`/admin/login`

---

# 25. Data Import

There are already three Excel files containing selected competition entries.

Each file contains:

- Serial
- Name
- Photo Title
- Drive Link

Categories:

Mobile:
117 selected photos

Device:
60 selected photos

Story:
15 selected stories

Create an import/seed script that converts these records into Supabase `entries`.

---

# 26. Photo Storage

Photos will first be downloaded locally from Google Drive.

Then upload them to:

**Supabase Storage**

Do not depend on Google Drive as the production image host for the judging portal.

---

# 27. Storage Structure

Suggested Supabase Storage structure:

```text
photos/
    mobile/
        001.jpg
        002.jpg
        003.jpg

    device/
        001.jpg
        002.jpg
        003.jpg

    story/
        001/
            1.jpg
            2.jpg
            3.jpg

        002/
            1.jpg
            2.jpg
            3.jpg
```

Story images should remain grouped inside their respective Story folder.

---

# 28. Image Loading

Because judges will be reviewing many high-resolution photographs:

Optimize image delivery.

Requirements:

- Do not freeze the interface while loading
- Show loading placeholders
- Preserve aspect ratio
- Allow large photo viewing
- Avoid unnecessary repeated downloads
- Preload the next photo where practical

Possible later improvement:

Generate smaller preview images for judging while preserving original photos separately.

---

# 29. UI Style

Use a:

- Dark or neutral interface
- Minimal photo-review layout
- Large photo area
- Clean typography
- Minimal distractions

The photograph should remain the visual focus.

Avoid excessive animations and decorative UI.

---

# 30. Desktop and Responsive Support

Primary usage will likely be desktop/laptop judging.

Design:

**Desktop-first**

But maintain responsive support for:

- Laptop
- Tablet
- Mobile

Judging should still be usable from a tablet.

---

# 31. Score Input UX

Score input should be extremely fast.

Possible UI:

`Score: [ 8.5 ] / 10`

The judge should be able to:

- Click input
- Type score
- Press Enter
- Move to next photo

Optional later improvement:

Quick-score buttons:

`6  7  7.5  8  8.5  9  9.5  10`

But the normal number input should remain available.

---

# 32. Progress Tracking

Judge progress should be calculated from completed score records.

Example:

Mobile:

`35 / 117`

Device:

`22 / 60`

Story:

`8 / 15`

Overall:

`65 / 192`

An entry counts as completed when the judge has submitted a valid score.

A remark is optional and should not affect completion status.

---

# 33. Security Requirements

Important:

- Never expose Supabase service-role key in frontend code.
- Store sensitive keys in environment variables.
- Judge PINs must be hashed.
- Never store judge PINs as plain text.
- Judges can only access their own scores.
- Judges cannot access other judges' scores.
- Judges cannot access averages.
- Admin can access all judging results.
- Score validation must exist at database/server level.
- Score must remain between 0 and 10.
- Protect Admin routes.
- Protect Judge routes.

---

# 34. Environment Variables

Use environment variables for values such as:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The Service Role Key must never be exposed through frontend JavaScript.

Use it only in secure server-side scripts/functions when necessary.

---

# 35. Error Handling

The application should provide clear states for:

- Loading
- Saving
- Saved
- Save Failed
- Image Load Failed
- Invalid PIN
- Invalid Username
- Session Expired
- Empty Category
- Network Error

Do not silently fail.

---

# 36. Judge Experience

The complete judge workflow should be:

```text
Judge Login
    ↓
Dashboard
    ↓
Select Category
    ↓
View Photo / Story
    ↓
Give Score
    ↓
Optional Remark
    ↓
Autosave
    ↓
Next
```

Judging should require as few clicks as possible.

---

# 37. Admin Experience

Admin workflow:

```text
Admin Login
    ↓
Dashboard
    ↓
Monitor Judge Progress
    ↓
View Results
    ↓
Filter / Sort
    ↓
Review Remarks
    ↓
Export Results
```

---

# 38. Implementation Order

Build the system incrementally.

### Phase 1 — Project Setup

1. Initialize React + Vite project.
2. Configure Supabase.
3. Configure environment variables.
4. Create database schema.
5. Create Supabase Storage bucket.
6. Configure routes.

### Phase 2 — Authentication

7. Configure Admin Supabase Auth.
8. Build Admin login.
9. Build Judge username + PIN authentication.
10. Implement secure PIN hashing.
11. Build Judge session handling.
12. Implement Judge logout.
13. Protect Judge routes.
14. Protect Admin routes.

### Phase 3 — Data

15. Create Excel import script.
16. Import Mobile entries.
17. Import Device entries.
18. Import Story entries.
19. Upload Mobile photos.
20. Upload Device photos.
21. Upload Story folders.
22. Populate Story image order.

### Phase 4 — Judge Interface

23. Build Judge Dashboard.
24. Add category progress.
25. Build Mobile judging interface.
26. Build Device judging interface.
27. Build Story judging interface.
28. Add large image viewer.
29. Add score input.
30. Add remarks input.
31. Implement autosave.
32. Add save status indicator.
33. Add Previous / Next navigation.
34. Add keyboard navigation.
35. Add overall progress.

### Phase 5 — Admin

36. Build Admin Dashboard.
37. Add Judge Progress overview.
38. Build Results table.
39. Calculate average scores.
40. Add category filtering.
41. Add result sorting.
42. Add search.
43. Display judge remarks.
44. Show missing scores.
45. Add CSV export.
46. Add Excel export if practical.
47. Add Judge management.
48. Add PIN reset functionality.

### Phase 6 — Testing

49. Create six dummy judge accounts.
50. Test judge login.
51. Test incorrect PIN handling.
52. Test judge isolation.
53. Verify judges cannot access other scores.
54. Test autosave.
55. Test interrupted internet connection.
56. Test session persistence.
57. Test Story image sequence.
58. Test Admin permissions.
59. Test export.
60. Test desktop interface.
61. Test tablet interface.

### Phase 7 — Deployment

62. Deploy frontend to Vercel.
63. Configure production environment variables.
64. Connect production Supabase project.
65. Create the real six Judge accounts.
66. Create Admin account.
67. Run final production judging test.

---

# 39. Development Principles

Do not overengineer the portal.

This is an event judging system with a small controlled user base.

Prioritize:

1. Reliable autosave
2. Fast image viewing
3. Simple judge login
4. Easy navigation
5. Clear progress
6. Secure score separation
7. Stable Admin reporting
8. Easy result export

The Judge interface should remain extremely simple.

The ideal Judge experience is:

**Login → Choose Category → View Photo → Score → Optional Remark → Next**

Everything else should stay out of the judge's way.