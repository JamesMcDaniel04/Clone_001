// Fetches the answer library from the Google Doc published to web (server-side,
// so it sidesteps browser CORS and keeps the doc URL off the client). Falls back
// to the bundled copy below when LIBRARY_DOC_URL is unset or unreachable.

export const FALLBACK_LIBRARY = `
## Authentication
**SSO / SAML 2.0**: People.ai supports SSO via SAML 2.0. Compatible with Okta, Azure AD, OneLogin, Ping Identity. SSO can be enforced org-wide. Owner: Victor Chang · Updated: Apr 2026
**MFA**: MFA supported and enforceable org-wide. TOTP and SMS supported (TOTP recommended). Owner: Victor Chang · Updated: Apr 2026
**RBAC**: Role-based access control with Admin, Manager, Rep, Read-Only roles. Custom roles not supported. Owner: Victor Chang · Updated: Mar 2026

## Compliance
**SOC 2 Type II**: Certified. Annual third-party audit; most recent covers the period ending Dec 2025. Reports available under NDA. Owner: Legal · Updated: Jan 2026
**FedRAMP**: NOT authorized. No published roadmap. NIST 800-53-aligned controls in place (AES-256 at rest, TLS 1.2+, MFA, RBAC, annual pen testing) but no FedRAMP equivalency claim. [KNOWN GAP — requires Legal sign-off before sending] Owner: Victor Chang · Updated: Feb 2026
**GDPR**: Compliant. Acts as data processor. DPA available and executed on request. Data subject requests handled within 30 days. Owner: Legal · Updated: Mar 2026
**CCPA**: Compliant. No selling of personal data. Opt-out and deletion supported. Owner: Legal · Updated: Mar 2026

## Data Security
**Encryption at rest**: AES-256 via AWS KMS. Owner: Victor Chang · Updated: Feb 2026
**Encryption in transit**: TLS 1.2+. TLS 1.0/1.1 disabled. Owner: Victor Chang · Updated: Feb 2026
**Data residency**: AWS US-East-1 and US-West-2. Data does not leave the US under standard config. EMEA-region hosting not offered. Owner: Engineering · Updated: Apr 2026
**Data retention**: Contract duration + 90-day grace period, then purged from production and backups. Earlier deletion on request. Owner: Legal · Updated: Mar 2026

## Infrastructure
**Cloud provider**: AWS. No on-premise or private cloud deployment. Owner: Engineering · Updated: Jan 2026
**Single-tenant / private cloud**: NOT available on any plan. [KNOWN GAP — requires Engineering + Legal sign-off before sending] Owner: Engineering · Updated: Apr 2026
**Uptime SLA**: 99.9% for production. Status at status.people.ai. Owner: Engineering · Updated: Jan 2026
**Disaster recovery**: Documented DR plan, RTO 4 hours, RPO 1 hour. Annual DR tests. Owner: Engineering · Updated: Feb 2026

## Vulnerability Management
**Penetration testing**: Annual third-party pen test; most recent Q1 2026. Executive summary under NDA. Owner: Victor Chang · Updated: Jan 2026
**Vulnerability scanning**: Continuous automated scanning. Critical findings remediated within 24h, high within 7 days. Owner: Victor Chang · Updated: Feb 2026
**Patch management**: Rolling patches; critical security patches within 24h of release. Owner: Engineering · Updated: Feb 2026

## Subprocessors
**Subprocessors**: Key subprocessors include AWS (infra), Snowflake (data warehouse), Salesforce (CRM). List available on request, updated quarterly. 30 days' notice for material changes. Owner: Legal · Updated: Apr 2026

## Salesforce integration
**Salesforce data sync**: Managed package + API. Activity data (emails, calls, meetings) synced to Salesforce objects. Default initial sync is rolling 90 days of history, then continuous. Owner: Engineering · Updated: Mar 2026
**Multi-CRM / multi-instance Salesforce**: Multiple Salesforce instances can connect to one People.ai org. Cross-instance entity resolution supported (relevant for M&A multi-org environments). Owner: Engineering · Updated: Apr 2026

## Known gaps (always flag)
- FedRAMP authorization: not authorized, no roadmap
- Single-tenant / private cloud: not available
- ITAR / IL4 / IL5 / CMMC: not supported
- On-premise deployment: not available
- EMEA / non-US data residency: not available under standard config — confirm with Engineering before committing
`.trim();

export async function getLibrary() {
  const url = process.env.LIBRARY_DOC_URL;
  if (!url || url.startsWith("YOUR_")) {
    return { text: FALLBACK_LIBRARY, source: "fallback" };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trim()) throw new Error("published document was empty");
    return { text, source: "drive" };
  } catch (err) {
    console.warn("Library fetch failed, using fallback:", err.message);
    return { text: FALLBACK_LIBRARY, source: "fallback" };
  }
}
