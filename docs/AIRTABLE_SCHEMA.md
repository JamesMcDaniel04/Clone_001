# Airtable Schema — MAX: Machine Answer Expert

> ⚠️ **Superseded.** The platform now uses **Supabase (Postgres)** as its system of record — see
> [`DATA_MODEL.md`](DATA_MODEL.md) and `supabase/migrations/0001_init.sql`. This Airtable schema is
> kept only as historical reference from the Phase-0 prototype; the app no longer writes to Airtable.

## Base name: `Security Questionnaires`

Create one base with the four tables below. The app writes to them through the
[`/api/airtable`](../api/airtable.js) proxy, which resolves logical table keys
(`questionnaires`, `questions`, `library`, `flags`) to the names below. If you rename a table,
set the matching `AIRTABLE_*_TABLE` env var — no client change needed.

> **Optional.** Airtable is history/tracking only. With `AIRTABLE_TOKEN`/`AIRTABLE_BASE` unset,
> drafting, review, and `.txt` export all still work — writes are silently skipped.

---

## Table 1: Questionnaires

One row per questionnaire submitted (one per prospect / RFP).

| Field | Type | Notes |
|---|---|---|
| `Name` | Single line text | Auto-generated: `{Prospect} — {Month Year}`, e.g. "Govini — Jun 2026" |
| `Prospect` | Single line text | Company name |
| `Owner` | Collaborator | SE or AE who submitted |
| `Status` | Single select | `Draft` / `In review` / `Legal flagged` / `Approved` / `Sent` |
| `Submitted at` | Date | When the questionnaire was pasted in |
| `Sent at` | Date | When the final version went to the prospect |
| `Question count` | Number | Total questions in this batch |
| `Flagged count` | Formula | `COUNTIF({Questions.Flag}, TRUE)` |
| `Approved count` | Formula | `COUNTIF({Questions.Status}, "Approved")` |
| `Export URL` | URL | Link to a generated export, if you store one |
| `Notes` | Long text | Free text for context |
| `Questions` | Link to Table 2 | All questions in this questionnaire |

The app sets `Name`, `Prospect`, `Status`, `Question count`, `Submitted at` on create.

---

## Table 2: Questions

One row per question. Child of Questionnaires.

| Field | Type | Notes |
|---|---|---|
| `Question ID` | Single line text | e.g. `Q14` — from the original numbering |
| `Question text` | Long text | Full question as pasted |
| `Questionnaire` | Link to Table 1 | Parent questionnaire (the app links this on create) |
| `Topic` | Single select | `Authentication` / `Compliance` / `Data security` / `Infrastructure` / `Vulnerability mgmt` / `Subprocessors` / `Salesforce integration` / `Other` |
| `Claude draft` | Long text | Raw draft from Claude |
| `Edited answer` | Long text | Human-edited final answer (starts as a copy of the draft) |
| `Status` | Single select | `Draft` / `Edited` / `Approved` / `Needs legal` / `Needs engineering` / `Withheld` |
| `Flag` | Checkbox | True if Claude flagged this answer |
| `Flag reason` | Long text | Claude's flag explanation |
| `Library entries used` | Multiple select | Which library entries Claude cited (`typecast` creates options on the fly) |
| `Reviewer` | Collaborator | Who approved / flagged |
| `Reviewed at` | Date | When reviewed |
| `Promoted to library` | Checkbox | True if this answer was saved back to the library |
| `Library entry name` | Single line text | Name of the library entry created (if promoted) |

The app sets the draft fields on create, then PATCHes `Status` / `Edited answer` / `Promoted to
library` as reviewers act — using the record id returned from the create call.

> **Status mapping.** Claude's `flag_type` maps to `Status`: `Needs legal`/`Known gap` →
> **Needs legal**, `Needs engineering` → **Needs engineering**, `No library match` → **Withheld**,
> unflagged → **Draft**.

---

## Table 3: Answer Library

One row per approved answer promoted from a question. (The Google Doc is the *live* source Claude
reads; this table is the structured mirror / audit of what's been promoted.)

| Field | Type | Notes |
|---|---|---|
| `Entry name` | Single line text | e.g. "FedRAMP status", "SOC 2 Type II" (app uses the first 60 chars of the question) |
| `Topic` | Single select | Same options as Table 2 |
| `Answer text` | Long text | The approved answer text |
| `Owner` | Single select | `Victor Chang` / `Legal` / `Engineering` / `Product` |
| `Last updated` | Date | Set by the app on promote |
| `Known gap` | Checkbox | True if the entry describes a product limitation |
| `Gap severity` | Single select | `High` / `Medium` / `Low` |
| `Source questions` | Link to Table 2 | Questions this entry was promoted from |
| `Active` | Checkbox | Uncheck to retire an entry without deleting it |
| `Notes` | Long text | Internal context — not included in Claude drafts |

The "Save to library" button writes `Entry name`, `Answer text`, `Last updated`, `Known gap`,
`Active` here (Table 3) — earlier versions of the spec wrote these into Table 2 by mistake.

---

## Table 4: Flags log

One row per flag that required human action. Audit trail. The app creates a row here whenever Claude
flags an answer.

| Field | Type | Notes |
|---|---|---|
| `Question` | Link to Table 2 | Which question was flagged |
| `Flagged by` | Single select | `Claude` / `Reviewer` |
| `Flag type` | Single select | `Needs legal` / `Needs engineering` / `Known gap` / `No library match` |
| `Routed to` | Collaborator | Victor Chang, Legal, etc. |
| `Routed at` | Date | |
| `Resolved at` | Date | |
| `Resolution` | Single select | `Approved as-is` / `Edited and approved` / `Withheld` / `Escalated` |
| `Resolution notes` | Long text | |

---

## Views to set up

**Questionnaires** — `All` (grid, Submitted at desc) · `Active` (Status is not Sent) · `By owner`.
**Questions** — `Needs review` (Status = Draft or Edited) · `Flagged` (Flag = true) · `By topic` ·
`Approved` (for export).
**Answer Library** — `Active library` (Active = true, by Topic) · `Known gaps` · `Stale entries`
(Last updated before 6 months ago).

---

## Automations to configure

1. **New questionnaire → notify owner**: row created in Table 1 → Slack the owner.
2. **Flag → notify reviewer**: `Flag` checked in Table 2 (or a new Table 4 row) → email/Slack Victor
   Chang + Legal with the question text and flag reason.
3. **All approved → update questionnaire status**: all child Questions `Approved` → set parent
   Questionnaire `Approved`.
4. **Promoted to library → create library entry**: `Promoted to library` checked → create a Table 3
   row from the question's edited answer and topic. (The app also writes Table 3 directly on
   promote; pick one to avoid duplicates.)

---

## Keeping the library in sync with the Google Doc

The Google Doc is what Claude reads at runtime; Table 3 is the structured mirror. Keep them aligned
by exporting Table 3 to the doc periodically (manual CSV paste, a Zapier/Make automation, or a small
script that reads Table 3 via the Airtable API and rewrites the library section via the Google Docs
API).
