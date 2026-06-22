# MAX: Machine Answer Expert — Architecture & Data Flow

Diagrams are [Mermaid](https://mermaid.js.org/); they render natively on GitHub and in the
VS Code Mermaid preview. Source of truth for behavior is the code — see file references inline.

---

## 1. System architecture (components & trust boundaries)

The browser only ever holds the **public Supabase anon key** (RLS-protected). Secret keys —
`ANTHROPIC_API_KEY` and the Supabase service-role key — live only in the Vercel serverless
runtime and are never bundled to the client.

```mermaid
flowchart TB
    subgraph user["👤 Sales Engineer (browser)"]
        UI["React SPA · Vite + React Router<br/>src/App.jsx<br/>(Home · Projects · Reviews · Library · Settings)"]
        PARSE["Client-side file parsing<br/>xlsx · mammoth · pdfjs-dist<br/>src/lib/importParsers.js"]
        MATCH["Local library matcher<br/>src/lib/libraryMatch.js<br/>(scopes library per batch)"]
        SBJS["Supabase JS client (anon key)<br/>src/lib/supabaseClient.js · db.js"]
    end

    subgraph vercel["☁️ Vercel — serverless functions (api/*.js, maxDuration 60s)"]
        DRAFT["/api/draft<br/>ground + draft answers"]
        REPORT["/api/report<br/>format review doc"]
        FETCH["/api/fetch-url<br/>SSRF-guarded page fetch"]
        SADMIN["supabaseAdmin.js<br/>(service-role / anon server session)"]
        SRC["sources.js + sourceCoverage.js<br/>supplemental knowledge"]
        ANTHLIB["anthropic.js<br/>SDK calls, JSON schema output"]
    end

    subgraph supabase["🗄️ Supabase (Postgres + Auth, system of record)"]
        AUTH["Auth<br/>email/password · anonymous · domain trigger"]
        DB[("Postgres + Row-Level Security<br/>profiles · categories · library_entries<br/>tags · merge_variables · projects<br/>project_sections · project_entries · app_settings")]
    end

    ANTH["🤖 Anthropic API<br/>claude-opus-4-8 (default)<br/>structured JSON output"]
    EXT["🌐 External knowledge sources<br/>People.ai docs · configured trust-portal URLs"]

    UI --> PARSE
    UI --> MATCH
    UI --> SBJS
    SBJS -- "read/write (RLS as signed-in user)" --> DB
    SBJS -- "sign in / session" --> AUTH

    UI -- "POST questions + scoped library" --> DRAFT
    UI -- "POST answers" --> REPORT
    UI -- "POST url (import knowledge)" --> FETCH

    DRAFT --> SADMIN
    DRAFT --> SRC
    DRAFT --> ANTHLIB
    REPORT --> ANTHLIB
    SADMIN -- "service key (bypasses RLS)" --> DB
    SRC -- "live fetch (cached 30m)" --> EXT
    FETCH -- "fetch + strip HTML" --> EXT
    ANTHLIB -- "secret key (server-only)" --> ANTH

    classDef secret fill:#fde2e2,stroke:#c0392b,color:#7b1f1f;
    classDef public fill:#e3f0ff,stroke:#2f6fb0,color:#163a5f;
    class ANTHLIB,SADMIN,SRC secret;
    class SBJS,UI,PARSE,MATCH public;
```

**Trust boundary:** everything in the *browser* box runs with the public anon key under RLS.
Everything in the *Vercel* box runs with secrets and is the only tier that talks to Anthropic or
holds the service-role key. The browser never sees `ANTHROPIC_API_KEY`.

---

## 2. Core data flow — drafting a questionnaire

End-to-end path from importing a questionnaire to a reviewed, exportable answer set. The client
batches the questionnaire (`DRAFT_BATCH_SIZE = 6`, `DRAFT_CONCURRENCY = 6`) so it stays under the
server's `MAX_QUESTIONS_PER_REQUEST = 10` and the 60s function limit. See
[src/pages/projects/Project.jsx](../src/pages/projects/Project.jsx) and
[api/draft.js](../api/draft.js).

```mermaid
sequenceDiagram
    autonumber
    actor SE as Sales Engineer
    participant UI as React SPA
    participant SB as Supabase (RLS)
    participant API as /api/draft (Vercel)
    participant SRC as Supplemental sources
    participant CL as Anthropic (Claude)

    SE->>UI: Paste / import questionnaire
    UI->>UI: Parse questions (importParsers.js)
    UI->>SB: Read library_entries (getLibraryEntries)
    SB-->>UI: Library entries (title + content)

    loop Each batch of ≤6 questions (6 in parallel, with backoff)
        UI->>UI: Match top entries per question (libraryMatch.js) → scoped library text
        UI->>API: POST { questions, prospect, library: scoped }
        Note over API: client library preferred; else getDbLibrary(); else bundled
        API->>SRC: getSupplementalSources() (coverage + URLs, cached 30m)
        SRC-->>API: Supplemental knowledge block
        API->>CL: messages.stream(system=rules+library, json_schema, thinking OFF)
        CL-->>API: { answers[]: classification, flag, sources, ... }
        API-->>UI: answers[]
    end

    UI->>SB: Insert/update project_entries (draft_answer, status, flags)
    SB-->>UI: Saved rows
    UI-->>SE: Render cards bucketed: Approved · Needs review · Gaps

    SE->>UI: Edit / approve / flag answers
    UI->>SB: updateProjectEntry(...)
    SE->>UI: Export → POST /api/report → formatted review draft
```

**Grounding precedence inside `/api/draft`** (api/draft.js:40):
`clientLibrary` (what the signed-in browser already read) → `getDbLibrary()` (server reads Supabase
with the service-role/anon session) → bundled `FALLBACK_LIBRARY`. Supplemental sources are
**always appended**.

**Answer classification** (api/_lib/anthropic.js, rule 9) maps to the project-entry status buckets:

```mermaid
flowchart LR
    Q["Question"] --> CL["Claude drafts + classifies"]
    CL -->|"approved (flag=false)"| A["✅ Approved · safe to send"]
    CL -->|"needs_review (flag=true)"| R["⚠️ Needs review<br/>legal / engineering sign-off"]
    CL -->|"gap (flag=false)"| G["🕳️ Gap · no library answer<br/>→ recheckGaps() after adding content"]
    A & R -.->|human approves| EXP["Exportable"]
    G -.->|add library entry, re-check| CL
```

---

## 3. Knowledge ingestion (building the Library)

Two ways content enters `library_entries`: client-parsed file uploads, and server-fetched URLs
(the browser can't fetch arbitrary pages due to CORS, and the fetch is SSRF-guarded server-side).

```mermaid
flowchart TB
    subgraph browser["Browser"]
        FILE["Upload file<br/>.xlsx · .csv · .docx · .pdf · .txt"]
        URLIN["Paste a URL"]
        IMP["ImportModal.jsx"]
        P["importParsers.js<br/>(xlsx · mammoth · pdfjs)"]
    end
    FU["/api/fetch-url<br/>fetch + strip HTML → text<br/>(blocks private/loopback hosts)"]
    DB[("library_entries<br/>title · content · category<br/>tags · status · review metadata")]

    FILE --> IMP --> P -->|extracted text| DB
    URLIN --> FU -->|"{ title, text, source_url }"| DB
    DB -->|grounds drafting| API["/api/draft"]
```

---

## 4. Data model (relationships)

Postgres on Supabase; full DDL in [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql).
Every content table has RLS enabled with a broad shared-workspace policy (any authenticated/anonymous
session may read/write). See [docs/DATA_MODEL.md](DATA_MODEL.md).

```mermaid
erDiagram
    profiles ||--o{ categories : "reviewer_id"
    profiles ||--o{ library_entries : "created_by / updated_by / reviewed_by"
    profiles ||--o{ projects : "owner_id"
    categories ||--o{ library_entries : "category_id"
    categories ||--o{ categories : "parent_id (sub-categories)"
    projects ||--o{ project_sections : "project_id"
    project_sections ||--o{ project_entries : "section_id"
    projects ||--o{ project_entries : "project_id (flat)"

    profiles {
        uuid id PK "= auth.users.id"
        text email
        text full_name
        text role
    }
    categories {
        uuid id PK
        text name
        uuid parent_id FK
        uuid reviewer_id FK
        text next_review_cycle
    }
    library_entries {
        uuid id PK
        uuid category_id FK
        text title
        text content
        text source_type "text | file"
        text status "review state"
        text[] tags
        int times_used
    }
    projects {
        uuid id PK
        text name
        text prospect
        text status "draft|in_review|legal_flagged|approved|sent"
        bool is_template
        uuid owner_id FK
    }
    project_entries {
        uuid id PK
        uuid project_id FK
        uuid section_id FK
        text question
        text draft_answer
        text edited_answer
        text status "draft|edited|approved|needs_legal|needs_engineering|withheld"
        bool flag
        text flag_type
        text[] library_entries_used
    }
    merge_variables {
        uuid id PK
        text name
        text value
    }
    tags {
        uuid id PK
        text name UK
    }
    app_settings {
        text key PK
        jsonb value
    }
```

**Two answer stores, one promotion path:** reusable approved answers live in `library_entries`;
per-questionnaire answers live in `project_entries` (exportable only when `status = 'approved'`).
A project answer becomes reusable library source **only when a reviewer promotes it** into
`library_entries` — the AI draft is an input to review, never automatically authoritative.

---

## 5. Auth & access

```mermaid
flowchart LR
    V["Visitor"] --> RA{"isSupabaseConfigured?"}
    RA -->|no| SETUP["Setup notice (RequireAuth.jsx)"]
    RA -->|yes| S{"Session?"}
    S -->|no| LOGIN["/login — email+password<br/>signup restricted to<br/>backstory.ai / people.ai<br/>(DB trigger, migration 0009)"]
    S -->|yes| APP["App shell + routes"]
    LOGIN -->|confirm email| APP
```

> **Note:** RLS is currently a permissive shared-workspace policy and anonymous sessions are
> enabled, so production access should be gated at the hosting layer (e.g. Vercel Deployment
> Protection) until role-based Supabase policies are introduced.
