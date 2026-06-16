# Clone — Setup Guide

From an empty machine to a live URL your team can bookmark. ~1 afternoon.

## What this is

A web app that:
1. Fetches your answer library from a Google Doc at runtime
2. Calls Claude (server-side) to draft grounded answers against that library
3. Lets reviewers approve / flag / edit each answer
4. Saves history to Airtable (optional)
5. Exports approved answers to a `.txt` file

**Architecture note:** unlike a paste-one-file app, secrets never touch the browser. The Anthropic
key, Airtable token, and library URL live in environment variables read only by the serverless
functions in [`api/`](../api). That's why a small backend exists — a browser-only build would expose
those keys to anyone who opens the page.

---

## 0. Prerequisites

- Node 18+ (`node --version`)
- An Anthropic API key — https://console.anthropic.com/settings/keys
- A Vercel account (free Hobby tier is fine) — https://vercel.com
- (Optional) Airtable account for history; Google account for the live library

---

## 1. Run it locally

```bash
npm install

# Copy env template and fill in at least ANTHROPIC_API_KEY
cp .env.example .env.local

# Run UI + API together (installs the Vercel CLI if needed)
npm i -g vercel
vercel dev
```

Open the printed URL (usually `http://localhost:3000`). `vercel dev` reads `.env.local` and runs the
`/api` functions alongside the Vite UI.

> `npm run dev` runs the **UI only** (faster HMR), but `/api/library` and `/api/draft` will 404
> until you use `vercel dev` or deploy. For real drafting, use `vercel dev`.

With nothing else configured, the app loads the **bundled fallback library** and you can draft
immediately once `ANTHROPIC_API_KEY` is set.

---

## 2. Google Drive — the live answer library

1. Open [`docs/SYSTEM_PROMPT.md`](SYSTEM_PROMPT.md) and copy everything under **"Answer Library"**
   into a new Google Doc.
2. **File → Share → Publish to web → Plain text (.txt) → Publish.**
3. Copy the URL (looks like `https://docs.google.com/document/d/XXXX/pub?output=txt`).
4. Set it as `LIBRARY_DOC_URL` (in `.env.local` for local, and in Vercel for production).

Updating answers later: edit the Google Doc. The app fetches the latest version on each draft — no
redeploy.

---

## 3. Airtable — history & tracking (optional)

1. Create a base named **Security Questionnaires** with the four tables in
   [`docs/AIRTABLE_SCHEMA.md`](AIRTABLE_SCHEMA.md).
2. Create a Personal Access Token at https://airtable.com/create/tokens
   - Scopes: `data.records:read`, `data.records:write`
   - Access: your base
3. Set `AIRTABLE_TOKEN` and `AIRTABLE_BASE` (the `appXXXXXXXX` from the base URL).

If you renamed any table, set the matching `AIRTABLE_*_TABLE` var. Leave Airtable vars blank to run
without history.

---

## 4. Deploy to Vercel

```bash
vercel          # first run links/creates the project
vercel --prod   # deploy to production
```

Then add your environment variables in the Vercel dashboard
(**Project → Settings → Environment Variables**) for the Production (and Preview) environments:

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Claude API key |
| `ANTHROPIC_MODEL` | — | Defaults to `claude-opus-4-8`. Set `claude-sonnet-4-6` for cheaper/faster. |
| `LIBRARY_DOC_URL` | — | Published Google Doc URL (falls back to bundled library if unset) |
| `AIRTABLE_TOKEN` | — | Enables history |
| `AIRTABLE_BASE` | — | `appXXXXXXXX` |
| `AIRTABLE_*_TABLE` | — | Only if you renamed tables |

Redeploy after changing env vars (`vercel --prod`). Share the URL with your team. Done.

> Drafting with Opus 4.8 + thinking can take longer than a few seconds on large batches; the
> functions are configured with a 60s max duration in [`vercel.json`](../vercel.json). Very large
> questionnaires (40+ questions) may be worth splitting into two runs.

---

## 5. Lock it to your team (optional, recommended)

Two easy options:

- **Vercel Authentication** (no code): Project → Settings → Deployment Protection → require Vercel
  login / SSO. Simplest gate.
- **Google OAuth gate** (`@people.ai` only): `npm install @react-oauth/google`, wrap `<App />` in
  `src/main.jsx` with `<GoogleOAuthProvider clientId="...">`, and render a login screen that only
  lets `@people.ai` emails through. (Not wired by default — it needs your own Google OAuth client
  id.)

---

## 6. Team workflow

1. SE receives a vendor security questionnaire (email / PDF / Word).
2. Paste the questions into the tool, pick the prospect, hit **Draft answers**.
3. Review each answer:
   - **Approve** → marks it ready for export
   - **Needs legal / engineering** → already flagged by Claude; routed via the Flags log automation
   - **Edit** → tweak wording inline (saved back to Airtable)
   - **Save to library** → pushes an approved answer into the Answer Library table
4. **Export approved (.txt)** → paste into your questionnaire template.

---

## Files in this repo

| Path | What it is |
|---|---|
| `src/App.jsx` | The React review UI |
| `api/` | Serverless backend: `draft` (Claude), `library` (Google Doc), `airtable` (proxy) |
| `docs/SYSTEM_PROMPT.md` | Drafting rules + the answer library to paste into Google Docs |
| `docs/AIRTABLE_SCHEMA.md` | Full Airtable base structure |
| `docs/SETUP.md` | This file |
| `.env.example` | Every environment variable, documented |
