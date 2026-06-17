# Clone — Setup Guide

From an empty machine to a live shared workspace. The app needs three services: **Supabase**
(database + anonymous sessions), **Anthropic** (drafting), and **Vercel** (hosting).

## 0. Prerequisites

- Node 18+ (`node --version`)
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- A [Vercel](https://vercel.com) account

---

## 1. Supabase — database + anonymous sessions

1. Create a new Supabase project. Note the **Project URL** and the **anon** and **service_role**
   keys (Project Settings → API).
2. Open the **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` (schema + Row-Level Security)
   - `supabase/migrations/0002_prospects.sql` (prospects/clients table)
   - `supabase/seed.sql` (categories + starter InfoSec library so the app isn't empty)
   *(or `supabase db push` + `supabase db reset` if you use the Supabase CLI.)*
3. **Authentication → Sign In / Providers → Anonymous Sign-Ins:** enable anonymous sign-ins.
   The app creates an anonymous Supabase session automatically so RLS policies still apply
   without showing a login screen.

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

This app does not show a login screen. Anyone who can load the deployed URL can create an anonymous
session and read/write the shared workspace. Use **Vercel Deployment Protection** or another outer
gate if the deployment should only be available to two or three people.

---

## 6. Importing your real library (~1,200 entries)

The seed ships ~17 InfoSec entries. To load your full library, insert into `public.library_entries`
(columns: `category_id`, `question`, `answer`, `status`, `tags`). Easiest paths: Supabase Table
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
