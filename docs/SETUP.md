# MAX: Machine Answer Expert — Setup Guide

From an empty machine to a live shared workspace. The app needs three services: **Supabase**
(database + anonymous sessions), **Anthropic** (drafting), and **Vercel** (hosting).

## 0. Prerequisites

- Node 18+ (`node --version`)
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- A [Vercel](https://vercel.com) account

---

## 1. Supabase — database + email/password sign-in

1. Create a new Supabase project. Note the **Project URL** and the **anon** and **service_role**
   keys (Project Settings → API).
2. Open the **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` (schema + Row-Level Security)
   - `supabase/migrations/0002_prospects.sql` … through the latest numbered migration in
     `supabase/migrations/` (each adds a feature; run any you haven't yet).
   - `supabase/seed.sql` (categories + starter InfoSec library so the app isn't empty)
   *(or `supabase db push` + `supabase db reset` if you use the Supabase CLI.)*
3. **Authentication → Sign In / Providers → Email:** enable the Email provider. Leave
   **Anonymous Sign-Ins** OFF — the app now requires a real login. **Confirm email** is optional:
   - **OFF** (quickest): sign-up logs the user straight in (no emailed code needed). The
     backstory.ai/people.ai restriction still applies. Use this if SMTP isn't set up yet —
     a 504 timeout on `/signup` means Supabase tried to send a confirmation email with no working SMTP.
   - **ON** (recommended for prod): users must enter a 6-digit code, which requires working SMTP
     (Authentication → Emails) and the template change in step 4. The app supports both modes.
4. **Authentication → Email Templates → Confirm signup:** include the one-time code in the
   template so users get a 6-digit code (not just a magic link), e.g. add a line:
   `Your code is {{ .Token }}`. The app verifies this code on the confirm-email screen.
5. Sign-up is restricted to **backstory.ai** and **people.ai** addresses. This is enforced in the
   browser (friendly message) and at the database level by the trigger in
   `supabase/migrations/0009_email_domain.sql` — make sure that migration ran. To change the
   allowed domains, edit that trigger and `ALLOWED_DOMAINS` in `src/pages/Login.jsx`.

---

## 2. Local environment

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where it comes from |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → anon/public publishable key (public, RLS-protected) |
| `SUPABASE_URL` | same Project URL (server-side, for the drafting API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key (**secret**) |
| `ANTHROPIC_API_KEY` | Anthropic console |
| `ANTHROPIC_MODEL` | optional; default `claude-opus-4-8`, or `claude-sonnet-4-6` for cheaper/faster |
| `KNOWLEDGE_SOURCE_URLS` | optional comma/newline-separated URLs for trust portal, Seismic, API docs, or other public/hosted source materials |
| `FETCH_DEFAULT_KNOWLEDGE_SOURCE_URLS` | optional; set `true` to live-fetch the built-in public People.ai URLs. Leave blank on Vercel if drafting times out. |

---

## 3. Run it

```bash
npm i -g vercel
vercel dev          # runs the UI + the /api functions together (reads .env.local)
```

Open `http://localhost:3000` and you'll land on Home. Library Management shows the seeded
categories; create a Project, paste questions, and **Draft answers** runs Claude grounded on your
Supabase library.

> `npm run dev` runs the **UI only** (no `/api`), so drafting needs `vercel dev` or a deploy.
> Before Supabase is configured, the app renders a "Connect Supabase" notice instead of crashing.

---

## 4. Deploy to Vercel

```bash
vercel          # link/create the project
vercel --prod   # deploy
```

Add every variable from step 2 in **Vercel → Project → Settings → Environment Variables** (Production
+ Preview), then redeploy. Share the URL only with people who should access the shared workspace.

---

## 5. Restrict access to your team

The app requires email/password sign-in, restricted to **backstory.ai** and **people.ai** addresses,
with an email confirmation code (see step 1.3–1.5). New users sign up, receive a 6-digit code, and
verify it before they can enter. The data behind the login is still a single shared workspace —
everyone who signs in sees the same projects, reviews, and library.

Note: the `/api/*` serverless endpoints (drafting, report, URL import) are not auth-gated themselves;
they hold no data and rely on the server-side `ANTHROPIC_API_KEY`. Add **Vercel Deployment Protection**
if you also want to gate those at the network edge.

---

## 6. Importing your real library (~1,200 entries)

The seed ships ~17 InfoSec entries. To load your full library, insert into `public.library_entries`
(columns: `category_id`, `title`, `content`, `source_type`, `status`, `tags`). Easiest paths: Supabase Table
Editor → Import CSV into `library_entries`, or a one-off SQL `insert … select` like `seed.sql`.
Bulk Excel/CSV import in the UI is on the roadmap (see below).

---

## 7. What's built vs. on the roadmap

**Built:** Shared anonymous access · Home dashboard · Library Management (categories, entries, search,
merge variables, tags) · Reviews queue with filters · Projects (create, paste/parse questions, AI
drafting grounded on the library, review/flag/edit/approve, promote to library, `.txt` export).

**Roadmap (scaffolded/stubbed):** Excel/source-document import parsing · template publish &
versioning · realtime "Open Collaboration" · merge-variable substitution into drafts · review
assignment notifications · usage analytics · bulk CSV import UI.

## Files

| Path | What it is |
|---|---|
| `src/` | React app (pages, components, auth, data helpers) |
| `api/` | Vercel functions — `draft` (Claude, grounded on Supabase) |
| `supabase/migrations/0001_init.sql` | Schema + RLS |
| `supabase/migrations/0002_prospects.sql` | Prospects/clients table |
| `supabase/seed.sql` | Starter categories + library |
| `docs/DATA_MODEL.md` | Table-by-table data model |
| `.env.example` | Every environment variable, documented |
