-- Real People.ai answer library (33 entries) → public.library_entries.
-- Idempotent: skips any question already present. [Client Name] placeholders are
-- written as [[Client Name]] so the app's merge-variable substitution resolves them.

insert into public.library_entries (category_id, question, answer, status, tags)
select (select id from public.categories where name = e.cat limit 1), e.q, e.a, 'never_reviewed', e.tags
from (values

('Company Overview',
 'Please provide a high-level description of SalesAI, including its business objectives and scope.',
 'SalesAI by People.ai is a Generative AI sales assistant, built to leverage Large Language Models (LLMs) and ingest data from People.ai, [[Client Name]] systems (CRM and others), and publicly available data to power multiple use cases such as:

- Summaries - deliver real-time updates on Account or Opportunity engagement based on all meetings, call transcripts, emails, and engaged stakeholders
- Deal Qualification - methodology agnostic, including but not limited to MEDDPICC, Miller Heiman, Challenger, etc
- Pipeline Analysis - identifying risk and upside in the forecast, surfacing insights to sales leaders
- Automated Account plans & Deal qualification - Use SalesAI to fill out most common information from public internet, ongoing customer events (earning calls) and internal strategy alignment (SalesAI)
- Forecasting - SalesAI recommends forecast category and reasoning, based on factual activity/engagement, market, intent and other signal data.
- Coaching - provide insights and recommendations to sellers and sales leaders',
 '{}'::text[]),

('Legal, Data Privacy, GDPR, EU AI Act, etc',
 'Will you use ongoing customer data to train, tune, or improve your Generative AI models?',
 'Customer data is not used to train, tune, or improve our generative AI models. [[Client Name]] can perform or request deletion of data at any time.',
 '{Artificial Intelligence,GenAI,Generative,Models,Training}'::text[]),

('InfoSec (Use this)', 'Do your media sanitization procedures include secure destruction of electronic and hardcopy media?',
 'Yes. AWS snapshots for backups with lifecycle removal; IT securely erases equipment; removable media disabled via JAMF; paper shredded.', '{}'::text[]),

('InfoSec (Use this)', 'Do you permit external technical solutions to restrict use of unencrypted portable media?', 'Yes.', '{}'::text[]),

('InfoSec (Use this)', 'How many external resources are responsible for your information security program?',
 '2 — Contractor (Principal Vulnerability Management & Incident Response Architect), Contractor (Senior Security Engineer).', '{}'::text[]),

('InfoSec (Use this)', 'How many internal resources are responsible for your information security program?',
 '3 — CISO, Sr. Manager of Security (backfill pending), Sr. Application Security Engineer (backfill pending).', '{}'::text[]),

('InfoSec (Use this)', 'Are firewalls implemented on the network perimeter as a gateway between trusted and untrusted networks?', 'Yes.', '{}'::text[]),

('InfoSec (Use this)', 'When was the last update to the network diagram?', 'Q3 2025 as part of Q4 2025 SOC 2 and ISO 27001 compliance readiness.', '{}'::text[]),

('InfoSec (Use this)', 'Is the network diagram updated when changes in network segments, points of entry and/or border gateways occur?', 'Yes.', '{}'::text[]),

('InfoSec (Use this)', 'Where are system passwords stored?',
 'People.ai does not store user credentials — it federates with the customer identity provider (Okta, Google Apps, Microsoft 365, Ping Federate, SAML 2.0). Internal passwords are kept in a Password Manager per NIST guidance (12+ chars, 1 special char, no expiration unless compromised).', '{}'::text[]),

('InfoSec (Use this)', 'How often are passwords changed for default system accounts?', 'No expiration unless credentials have been compromised.', '{}'::text[]),

('InfoSec (Use this)', 'What percentage of server and database admin/system accounts are configured for strong passwords?', 'All.', '{}'::text[]),

('InfoSec (Use this)', 'If passwords are stored in AD, how is it hardened?', 'N/A — passwords are not stored in Active Directory.', '{}'::text[]),

('InfoSec (Use this)', 'What resources are responsible for managing external breach notifications?',
 'People.ai notifies customers without undue delay per contractual obligations, conducts root cause analysis, and shares remediation plans upon request. Compliant with CCPA and GDPR.', '{}'::text[]),

('InfoSec (Use this)', 'What tools are used to manage perimeter security and perform attack and penetration testing?',
 'Third-party annual pen tests plus Google OAuth assessment (annually) and vulnerability scans (daily). Internal tools: Burp Suite Professional, Metasploit Framework, Nmap/Nessus, OWASP ZAP, Kali Linux toolset.', '{}'::text[]),

('InfoSec (Use this)', 'What percentage of third-party connections have a valid contract and active business relationship?', 'Further clarification requested; to be addressed at the appropriate time.', '{}'::text[]),

('InfoSec (Use this)', 'How many third-party connections are not using a secure VPN or dedicated connection?', 'None.', '{}'::text[]),

('InfoSec (Use this)', 'What is the average frequency of review of user permissions and accounts?', 'Immediately upon employee departure or role change. Customer access is controlled by the customer.', '{}'::text[]),

('InfoSec (Use this)', 'How often are system accounts reviewed and disabled if no longer needed?', 'Immediately upon employee departure or role change via HRIS/SSO integration. Customer access is controlled by the customer.', '{}'::text[]),

('InfoSec (Use this)', 'Are laptops/desktops/workstations installed with and operating a firewall?', 'Yes.', '{}'::text[]),

('InfoSec (Use this)', 'What tools are used to deploy/maintain firewalls and encryption?', 'AES-256 at rest, 256-bit SSL for transport, AWS KMS for key management, and a JWT toolkit for authentication tokens.', '{}'::text[]),

('InfoSec (Use this)', 'Do you use AES-256 for data at rest?', 'Yes. Data is encrypted using AES-256; keys are stored in AWS KMS per customer.', '{}'::text[]),

('InfoSec (Use this)', 'Do you use TLS 1.2+ for transmission of data over an untrusted network?', 'Yes. All TCP transmission is done over TLS 1.2 or 1.3.', '{}'::text[]),

('InfoSec (Use this)', 'When was your last external penetration test?', 'November 2025.', '{}'::text[]),

('InfoSec (Use this)', 'Do you close high-risk findings in 30 days or less?', 'Yes. (No high-risk findings identified.)', '{}'::text[]),

('InfoSec (Use this)', 'Do you close critical-risk findings in 7 days or less?', 'Yes. (No critical-risk findings identified.)', '{}'::text[]),

('InfoSec (Use this)', 'How long does it take to apply high-risk patches?', 'Systems are always kept current — patches are triggered when a vulnerability is detected and/or when a new AMI is released.', '{}'::text[]),

('InfoSec (Use this)', 'How long does it take to apply critical patches?', 'Systems are always kept current — patches are triggered when a vulnerability is detected and/or when a new AMI is released.', '{}'::text[]),

('InfoSec (Use this)', 'How often do you perform vulnerability scans?', 'Daily.', '{}'::text[]),

('InfoSec (Use this)', 'Do you have anti-malware with up-to-date virus definitions (less than 14 days)?', 'Yes.', '{}'::text[]),

('InfoSec (Use this)', 'Are laptops/desktops/workstations installed with and operating anti-malware?', 'Yes.', '{}'::text[]),

('InfoSec (Use this)', 'What tools are used to deploy/maintain anti-malware and anti-spyware?',
 'CrowdStrike + Upwind (AWS monitoring), CrowdStrike Logscale SIEM, Rapid7 InsightAppSec (weekly external scans), and Bandit/PyUp/Trufflehog/NodeSecurity (CI/CD pipeline). Endpoints: CrowdStrike + native macOS. Okta MDM for fleet management.', '{}'::text[]),

('InfoSec (Use this)', 'Do you have whole disk encryption on laptops/desktops?', 'Yes. Full disk encryption on all endpoints using built-in macOS encryption.', '{}'::text[])

) as e(cat, q, a, tags)
where not exists (select 1 from public.library_entries le where le.question = e.q);
