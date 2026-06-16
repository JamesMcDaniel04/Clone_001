# Clone — Drafting rules & answer library

There are two pieces here, and they live in different places:

1. **The drafting rules** (how Claude behaves) are baked into the app at
   [`api/_lib/anthropic.js`](../api/_lib/anthropic.js) → `SYSTEM_RULES`. Edit them there;
   they ship with the deploy. They're reproduced below for reference.
2. **The answer library** (the facts Claude draws on) is loaded at runtime from a Google Doc
   published to web. **Copy the "Answer Library" section below into that Google Doc** — that doc
   is the source of truth and can be edited without redeploying. If no doc is configured, the app
   uses the bundled fallback in [`api/_lib/library.js`](../api/_lib/library.js).

---

## Drafting rules (reference — actual copy lives in `api/_lib/anthropic.js`)

You are a security questionnaire drafting assistant for Clone. Draft accurate, defensible answers
to vendor security questionnaires using ONLY the answer library.

1. **Draft only from the library.** Every claim must be grounded in a library entry. Do not invent
   certifications, features, timelines, or commitments that aren't listed.
2. **Flag known limitations explicitly.** If a question touches FedRAMP, single-tenant / private
   cloud, ITAR, IL4 / IL5, CMMC, on-premise, or non-US / EMEA hosting, set `flag: true`, set
   `flag_type`, keep the limitation visible, and end the answer with
   `[FLAG: needs legal/engineering sign-off]`. Never soften or omit it.
3. **Be direct.** Plain, professional prose. No marketing language. Answer the question, then stop.
4. **Match the format.** Yes/no questions lead with Yes or No, then elaborate. Open-ended questions
   get 2–4 sentences.
5. **Cite your source.** End each grounded answer with `(Source: <entry name>, last updated <date>)`.
6. **No match → withhold.** If a question can't be answered from the library, set `draft_answer`
   to `null`, `flag: true`, `flag_type: "No library match"`.

The app uses **structured outputs**, so Claude returns a guaranteed-shape JSON array. Each item:
`question_id`, `question_text`, `draft_answer` (string or null), `flag` (bool),
`flag_reason` (string or null), `flag_type` (`Needs legal` / `Needs engineering` / `Known gap` /
`No library match` / null), `library_entries_used` (string[]).

### Known limitations — always flag

- FedRAMP authorization: **not authorized**, no published roadmap
- Single-tenant / private cloud deployment: **not available** on any plan
- ITAR / IL4 / IL5 / CMMC: **not supported**
- On-premise deployment: **not available**
- Data processing outside the US (EMEA): not offered under standard config — confirm with Engineering

---

## Answer Library

_Copy everything below this line into the Google Doc, then File → Share → Publish to web →
Plain text. Paste that URL into `LIBRARY_DOC_URL`. Editing the doc updates answers with no redeploy._

---

### Authentication & access control

**SSO / SAML 2.0**
Clone supports single sign-on via SAML 2.0. Compatible identity providers include Okta, Azure AD,
OneLogin, and Ping Identity. SSO can be enforced org-wide by administrators.
_Owner: Victor Chang · Updated: Apr 2026_

**MFA**
Multi-factor authentication is supported and can be enforced for all users via the admin console.
Supported methods include TOTP authenticator apps and SMS (TOTP recommended).
_Owner: Victor Chang · Updated: Apr 2026_

**Role-based access control**
Role-based access control (RBAC) with Admin, Manager, Rep, and Read-Only roles. Custom roles are
not currently supported.
_Owner: Victor Chang · Updated: Mar 2026_

---

### Compliance & certifications

**SOC 2 Type II**
SOC 2 Type II certified. Annual audit by a third-party auditor; the most recent report covers the
period ending December 2025. Reports available under NDA upon request.
_Owner: Legal · Updated: Jan 2026_

**FedRAMP status**
Not FedRAMP authorized. No formal roadmap to FedRAMP authorization. Controls consistent with NIST
800-53 guidance (AES-256 at rest, TLS 1.2+ in transit, MFA, RBAC, annual pen testing) are in place,
but no FedRAMP equivalency is claimed. [KNOWN GAP — requires Legal sign-off before sending]
_Owner: Victor Chang · Updated: Feb 2026_

**GDPR**
GDPR compliant. Acts as a data processor for customer data. A Data Processing Agreement (DPA) is
available and executed upon request. Data subject rights requests are handled within 30 days.
_Owner: Legal · Updated: Mar 2026_

**CCPA**
CCPA compliant. Personal data is not sold. Opt-out and deletion requests are supported.
_Owner: Legal · Updated: Mar 2026_

---

### Data security

**Encryption at rest**
All customer data is encrypted at rest using AES-256. Key management is handled via AWS Key
Management Service (KMS).
_Owner: Victor Chang · Updated: Feb 2026_

**Encryption in transit**
All data in transit is encrypted using TLS 1.2 or higher. TLS 1.0 and 1.1 are disabled.
_Owner: Victor Chang · Updated: Feb 2026_

**Data residency**
Customer data is stored and processed in AWS US-East-1 and US-West-2 by default. Data does not leave
the United States under standard configuration. EMEA-region hosting is not currently offered.
_Owner: Engineering · Updated: Apr 2026_

**Data retention**
Activity and engagement data is retained for the duration of the customer contract plus a 90-day
grace period, after which it is purged from all production and backup systems. Earlier deletion is
available on request.
_Owner: Legal · Updated: Mar 2026_

---

### Infrastructure & availability

**Cloud provider**
Hosted on Amazon Web Services (AWS). On-premise and private cloud deployment are not offered.
_Owner: Engineering · Updated: Jan 2026_

**Single-tenant / private cloud**
Single-tenant and private cloud deployment options are not currently available on any plan. This is
a known product limitation. [KNOWN GAP — requires Engineering + Legal sign-off before sending]
_Owner: Engineering · Updated: Apr 2026_

**Uptime SLA**
99.9% uptime SLA for production environments. Status and incident history at status.people.ai.
_Owner: Engineering · Updated: Jan 2026_

**Disaster recovery**
A documented disaster recovery plan with a target RTO of 4 hours and RPO of 1 hour. DR tests are
conducted annually.
_Owner: Engineering · Updated: Feb 2026_

---

### Vulnerability management

**Penetration testing**
Annual third-party penetration testing by an independent security firm. Most recent test completed
in Q1 2026. Executive summaries available under NDA upon request.
_Owner: Victor Chang · Updated: Jan 2026_

**Vulnerability scanning**
Continuous automated vulnerability scanning on all production infrastructure. Critical findings are
remediated within 24 hours; high findings within 7 days.
_Owner: Victor Chang · Updated: Feb 2026_

**Patch management**
OS and dependency patches applied on a rolling basis. Critical security patches applied within 24
hours of release.
_Owner: Engineering · Updated: Feb 2026_

---

### Subprocessors & third parties

**Subprocessors**
A current list of subprocessors is available upon request and updated quarterly. Key subprocessors
include AWS (infrastructure), Snowflake (data warehouse), and Salesforce (CRM integration).
Customers are notified of material changes with 30 days' notice.
_Owner: Legal · Updated: Apr 2026_

---

### Salesforce integration

**Salesforce data sync**
Integrates with Salesforce via a managed package and API. Activity data (emails, calls, meetings)
is synced to Salesforce objects. The standard sync window is configurable; default is rolling 90
days of historical data on initial connect, then continuous.
_Owner: Engineering · Updated: Mar 2026_

**Multi-CRM / multi-instance Salesforce**
Multiple Salesforce instances can connect to a single org. Cross-instance entity resolution is
supported — relevant for customers with M&A-driven multi-org Salesforce environments.
_Owner: Engineering · Updated: Apr 2026_

---

_End of library. If a question cannot be answered from the above entries, the draft is withheld and
flagged "No library match" for human input._
