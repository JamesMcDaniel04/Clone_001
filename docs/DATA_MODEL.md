# MAX: Machine Answer Expert — Data Model

Postgres on Supabase. Full DDL is in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
Every content table has **Row-Level Security** enabled with a single policy: any authenticated
Supabase session may read/write. The app creates anonymous sessions automatically so the deployment
acts as one shared workspace. Add an outer gate such as Vercel Deployment Protection if the URL
must be limited to a small team.

## Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Mirror of `auth.users`, auto-created on signup by a trigger | `id` (=auth uid), `email`, `full_name`, `avatar_url`, `role` |
| `categories` | Library categories (the Library Management rows) | `name`, `parent_id` (sub-categories), `next_review_cycle`, `reviewer_id` |
| `library_entries` | The knowledge library — system of record. Each entry is a titled block of content (pasted text or text extracted from an uploaded file) | `category_id`, `title`, `content`, `source_type` (`text`\|`file`), `file_type`, `file_size`, `status`, `tags[]`, `times_used`, `created_by/updated_by/reviewed_by`, `reviewed_at` |
| `tags` | Reusable labels | `name` (unique) |
| `merge_variables` | Reusable values for project answers | `name`, `type`, `value`, `comment`, `times_used` |
| `projects` | A questionnaire / RFP being answered | `name`, `prospect`, `status`, `is_template`, `owner_id` |
| `project_sections` | Outline: Sections → Subsections | `project_id`, `parent_section_id`, `name`, `instructions`, `position` |
| `project_entries` | Questions + drafted answers within a project | `project_id`, `section_id`, `question`, `draft_answer`, `edited_answer`, `status`, `flag`, `flag_type`, `flag_reason`, `library_entries_used[]`, `reviewer_id` |

## Status vocabularies

- **`library_entries.status`** (Reviews queue) — `never_reviewed`, `unassigned`, `assigned`,
  `approved_with_edits`, `approved_without_edits`. (Color dots in the UI come from `STATUS_DOT` in
  `src/lib/theme.js`.)
- **`project_entries.status`** — `draft`, `edited`, `approved`, `needs_legal`, `needs_engineering`,
  `withheld`. Claude's `flag_type` maps here (`Needs engineering` → `needs_engineering`,
  `No library match` → `withheld`, else `needs_legal`).
- **`projects.status`** — `draft`, `in_review`, `legal_flagged`, `approved`, `sent`.

## Relationships

```
profiles ──< categories.reviewer_id
profiles ──< library_entries.{created_by,updated_by,reviewed_by}
categories ──< library_entries.category_id
projects ──< project_sections ──< project_entries
projects ──< project_entries.project_id (direct, for flat questionnaires)
```

## Reviews

The Reviews queue isn't its own table — it's a filtered query over `library_entries`
(`src/lib/db.js` → `listReviews`) by category, status, and keyword. Approving an entry in Reviews
sets `status` + `reviewed_at`.

## Source of truth

Supabase Postgres is the source of truth. The canonical reusable answer base is
`public.library_entries`; it stores the approved answer text, category, tags, review status,
reviewer fields, and timestamps. `public.project_entries` stores answers inside a specific
questionnaire/project. Those project answers become sendable only when `status = 'approved'`; they
do not become reusable source material until a reviewer promotes or updates a `library_entries` row.

The frontend has no separate answer store. It reads and writes Supabase through
[`src/lib/db.js`](../src/lib/db.js). The primary screens are:

- Library Management/Search/Category: edits `library_entries` and `categories`.
- Reviews → From Library: reviews existing `library_entries`.
- Reviews → From Projects: curates `project_entries` into `library_entries`.
- Project workspace: stores draft/edited/approved questionnaire answers in `project_entries`.

## Governance

Governance is currently enforced by workflow and review metadata rather than strict role policies.
The app tracks `library_entries.status`, `reviewed_by`, `reviewed_at`, category reviewers,
`next_review_cycle`, project-answer status, and legal/engineering/no-match flags. The AI drafts are
inputs to review; they are not automatically authoritative. A human must approve a project answer
for export, and a human must add or update the library for that answer to become reusable.

RLS is enabled on every content table, but the current policy is intentionally broad for a shared
internal workspace: any authenticated Supabase session may read/write. Because anonymous sessions
are enabled, deploy access should be protected at the hosting layer unless/until `profiles.role` is
used for stricter Supabase policies.

## How drafting reads the library

`/api/draft` (server-side, service-role key) calls `getDbLibrary()`
([`api/_lib/supabaseAdmin.js`](../api/_lib/supabaseAdmin.js)), which formats all answered
`library_entries` grouped by category into the prompt context. If Supabase is unconfigured/empty it
falls back to the optional published document or bundled library in `api/_lib/library.js`.
