-- Seed data so the app isn't empty on first run. Idempotent: only inserts when the
-- target tables are empty. Replace/extend with your real ~1,200 entries via CSV import.

-- Categories (mirrors the reference Library Management screen)
insert into public.categories (name, position)
select v.name, v.position
from (values
  ('No Category', 0),
  ('Company Overview', 1),
  ('InfoSec (Use this)', 2),
  ('Legal, Data Privacy, GDPR, EU AI Act, etc', 3),
  ('Policies, Procedures & Certifications', 4),
  ('Subprocessors', 5)
) as v(name, position)
where not exists (select 1 from public.categories);

-- A couple of merge variables
insert into public.merge_variables (name, type, value, comment)
select v.name, v.type, v.value, v.comment
from (values
  ('Client Name (Default)', 'Project', 'Project Input (Default)', 'Populated with the Client Name in a Project')
) as v(name, type, value, comment)
where not exists (select 1 from public.merge_variables);

-- Library entries (the Phase-0 InfoSec library). Only when the table is empty.
insert into public.library_entries (category_id, question, answer, status)
select
  (select id from public.categories where name = 'InfoSec (Use this)' limit 1),
  e.q, e.a, 'never_reviewed'
from (values
  ('Do you support SSO via SAML 2.0?', 'Yes. MAX supports single sign-on via SAML 2.0. Compatible identity providers include Okta, Azure AD, OneLogin, and Ping Identity. SSO can be enforced org-wide by administrators. (Source: SSO / SAML 2.0, last updated Apr 2026)'),
  ('Do you support multi-factor authentication?', 'Yes. MFA is supported and can be enforced for all users via the admin console. Supported methods include TOTP authenticator apps and SMS (TOTP recommended). (Source: MFA, last updated Apr 2026)'),
  ('Do you support role-based access control?', 'Yes. Role-based access control (RBAC) with Admin, Manager, Rep, and Read-Only roles. Custom roles are not currently supported. (Source: Role-based access control, last updated Mar 2026)'),
  ('Are you SOC 2 Type II certified?', 'Yes. MAX is SOC 2 Type II certified. The annual third-party audit''s most recent report covers the period ending December 2025. Reports are available under NDA upon request. (Source: SOC 2 Type II, last updated Jan 2026)'),
  ('Is your platform FedRAMP authorized?', 'No. MAX is not FedRAMP authorized and has no published roadmap to authorization. We implement controls consistent with NIST 800-53 guidance (AES-256 at rest, TLS 1.2+, MFA, RBAC, annual pen testing) but do not claim FedRAMP equivalency. [FLAG: needs legal sign-off] (Source: FedRAMP status, last updated Feb 2026)'),
  ('Are you GDPR compliant?', 'Yes. MAX is GDPR compliant and acts as a data processor. A Data Processing Agreement (DPA) is available and executed upon request. Data subject rights requests are handled within 30 days. (Source: GDPR, last updated Mar 2026)'),
  ('Are you CCPA compliant?', 'Yes. MAX complies with CCPA. Personal data is not sold. Opt-out and deletion requests are supported. (Source: CCPA, last updated Mar 2026)'),
  ('How is data encrypted at rest?', 'All customer data is encrypted at rest using AES-256, with key management via AWS KMS. (Source: Encryption at rest, last updated Feb 2026)'),
  ('How is data encrypted in transit?', 'All data in transit is encrypted using TLS 1.2 or higher. TLS 1.0 and 1.1 are disabled. (Source: Encryption in transit, last updated Feb 2026)'),
  ('Where is customer data stored?', 'Customer data is stored and processed in AWS US-East-1 and US-West-2 by default and does not leave the United States under standard configuration. EMEA-region hosting is not currently offered. (Source: Data residency, last updated Apr 2026)'),
  ('What is your data retention policy?', 'Activity and engagement data is retained for the contract duration plus a 90-day grace period, after which it is purged from production and backup systems. Earlier deletion is available on request. (Source: Data retention, last updated Mar 2026)'),
  ('Do you offer single-tenant or private cloud deployment?', 'No. Single-tenant and private cloud deployment are not available on any plan. This is a known product limitation. [FLAG: needs engineering + legal sign-off] (Source: Single-tenant / private cloud, last updated Apr 2026)'),
  ('What is your uptime SLA?', 'MAX offers a 99.9% uptime SLA for production environments. Status and incident history are published on the status page. (Source: Uptime SLA, last updated Jan 2026)'),
  ('Describe your disaster recovery capabilities.', 'We maintain a documented disaster recovery plan with a target RTO of 4 hours and RPO of 1 hour. DR tests are conducted annually. (Source: Disaster recovery, last updated Feb 2026)'),
  ('Do you conduct penetration testing?', 'Yes. Annual third-party penetration testing is conducted by an independent firm; the most recent test was completed in Q1 2026. Executive summaries are available under NDA. (Source: Penetration testing, last updated Jan 2026)'),
  ('Describe your vulnerability management program.', 'Continuous automated vulnerability scanning runs on all production infrastructure. Critical findings are remediated within 24 hours and high findings within 7 days. (Source: Vulnerability scanning, last updated Feb 2026)'),
  ('Who are your subprocessors?', 'Key subprocessors include AWS (infrastructure), Snowflake (data warehouse), and Salesforce (CRM integration). A current list is available on request and updated quarterly, with 30 days'' notice of material changes. (Source: Subprocessors, last updated Apr 2026)')
) as e(q, a)
where exists (select 1 from public.categories where name = 'InfoSec (Use this)')
  and not exists (select 1 from public.library_entries);
