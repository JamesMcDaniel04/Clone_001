# Clone — security questionnaire tool

A lightweight alternative to Loopio for infosec/RFP questionnaires. Paste a vendor questionnaire,
Clone drafts grounded answers with Claude against your curated answer library, reviewers
approve / flag / edit, and you export approved answers — turning questionnaires around in well under
24 hours instead of days.

## How it works

```
Browser (React)  ──►  /api/draft     ──►  Claude (Opus 4.8, structured output)  ──► grounded answers
                 ──►  /api/library   ──►  Google Doc (published to web)          ──► answer library
                 ──►  /api/airtable  ──►  Airtable                               ──► history & flags
```

Secrets (Claude key, Airtable token, library URL) live **only** in serverless environment variables
— never in the browser bundle. That's the reason for the small `api/` backend.

## Stack

- **Frontend:** Vite + React (single review UI in `src/App.jsx`)
- **Backend:** Vercel serverless functions in `api/`, using the official `@anthropic-ai/sdk`
- **Model:** `claude-opus-4-8` by default (best accuracy for security/legal drafting). Set
  `ANTHROPIC_MODEL=claude-sonnet-4-6` to cut cost ~40% / go faster — it's a one-line env change.
- **Library:** a Google Doc published to web (edit answers without redeploying); a bundled fallback
  ships in `api/_lib/library.js`.

## Quick start

```bash
npm install
cp .env.example .env.local        # add at least ANTHROPIC_API_KEY
npm i -g vercel && vercel dev      # runs UI + API together on http://localhost:3000
```

`npm run build` produces the static frontend; `npm run dev` runs the UI only (the `/api` calls need
`vercel dev` or a deploy).

Full walkthrough — Google Doc, Airtable, deploy, optional auth gate — in
[`docs/SETUP.md`](docs/SETUP.md).

## What it does

- **Grounded drafting** — Claude answers strictly from the library; unsupported questions are
  withheld, not guessed.
- **Automatic flagging** — FedRAMP, single-tenant, ITAR/IL4/IL5/CMMC, on-prem, and non-US hosting
  are flagged for legal/engineering sign-off and routed via Airtable.
- **Structured output** — answers come back as validated JSON (no brittle parsing).
- **Review UI** — approve / flag / edit inline; promote good answers back into the library.
- **Export** — approved answers to `.txt` for pasting into your questionnaire template.

## Repo layout

| Path | Purpose |
|---|---|
| `src/App.jsx` | Review UI |
| `api/draft.js` | Claude drafting endpoint |
| `api/library.js` | Serves the library + its source (Drive vs fallback) |
| `api/airtable.js` | Airtable create/update proxy |
| `api/_lib/anthropic.js` | Claude client, system rules, output schema |
| `api/_lib/library.js` | Google Doc fetch + bundled fallback library |
| `docs/` | `SYSTEM_PROMPT.md`, `AIRTABLE_SCHEMA.md`, `SETUP.md` |

## Notes

- The seed library reflects an example security posture — edit it in your Google Doc.
- "Clone" is a working name; rename freely in `index.html` and `src/App.jsx`.
