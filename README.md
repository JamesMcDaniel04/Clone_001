# Clone — security questionnaire platform

A Loopio-style platform for infosec/RFP questionnaires. Maintain a reviewed answer **Library**,
answer vendor questionnaires as **Projects** with Claude drafting grounded on that library, work a
**Reviews** queue, and track everything in one place — turning questionnaires around in well under
24 hours instead of days.

## Information architecture

```
Home      → My Project Tasks · My Reviews · Create a Project
Projects  → list → project workspace (paste/import questions → AI draft → review/flag/edit → export)
Reviews   → filterable queue over the library (category · status · keyword)
Library   → Management (categories · entries) · Search · Merge Variables · Tags
```

## Stack

- **Frontend:** Vite + React + React Router (dark-navy platform chrome, warm editorial content)
- **Backend:** Supabase (Postgres + Google auth + Row-Level Security) — system of record
- **AI drafting:** Vercel serverless `/api/draft` using `@anthropic-ai/sdk`, **`claude-opus-4-8`**
  by default (adaptive thinking + structured output), grounded on the live Supabase library. The
  Anthropic key stays server-side. Set `ANTHROPIC_MODEL=claude-sonnet-4-6` for cheaper/faster.

Secrets live in environment variables; the browser only ever sees the Supabase **anon** key (public
by design, protected by RLS).

## Quick start

```bash
npm install
cp .env.example .env.local      # Supabase URL + keys, Anthropic key, allowed domain
# run supabase/migrations/0001_init.sql + supabase/seed.sql in the Supabase SQL editor
npm i -g vercel && vercel dev   # UI + API on http://localhost:3000
```

Full walkthrough (Supabase project, Google OAuth, deploy, library import) →
[`docs/SETUP.md`](docs/SETUP.md). Data model → [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## What's built vs. roadmap

**Built:** Google auth gate · Home · Library Management (categories, entries, search, merge
variables, tags) · Reviews queue with filters · Projects (create, parse questions, AI drafting,
review/flag/edit/approve, promote to library, `.txt` export).

**Roadmap:** Excel/source-doc import parsing · template publish/versioning · realtime collaboration ·
merge-variable substitution into drafts · review notifications · usage analytics · bulk CSV import UI.

## Repo layout

| Path | Purpose |
|---|---|
| `src/pages/` | Home, Projects, Reviews, Library pages |
| `src/components/` | TopNav, shared UI, Stepper, QuestionCard |
| `src/lib/` | `supabaseClient`, `db` (data access), `theme` |
| `src/auth/` | Session provider + domain-gated route guard |
| `api/draft.js` + `api/_lib/` | Claude drafting, grounded on Supabase |
| `supabase/` | Schema migration + seed |
| `docs/` | `SETUP.md`, `DATA_MODEL.md`, `AIRTABLE_SCHEMA.md` (superseded) |

"Clone" is a working name — rename freely in `index.html`, `src/components/TopNav.jsx`, and
`src/pages/Login.jsx`.
