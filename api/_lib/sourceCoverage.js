// Supplemental grounding pack for source classes that are not always represented
// as individual library entries yet. This intentionally excludes Oliver Williams'
// personal/direct chat input. Prefer live Supabase library entries when present;
// use this as additional context for public docs, uploaded API docs, CISO/security
// confirmation, certification-derived controls, and conservative AI risk inferences.

export const SOURCE_COVERAGE = `
## Supplemental Knowledge Sources

### People.ai public documentation - setup.people.ai and help.people.ai
Source scope: public documentation. Last updated: Jun 2026.
- SSO/authentication: People.ai/Backstory documentation describes Salesforce OAuth-based authentication and confirms that MFA/SSO settings enforced in Salesforce, including Okta-backed Salesforce SSO, are respected by the application.
- Salesforce integration: setup.people.ai documents Salesforce integration through the People.ai managed package, permissions, integration users, and Salesforce API connectivity.
- Data types and formats: public docs cover CRM/activity data capture and sync, including activities, contacts, opportunities, accounts, Salesforce objects/fields, and configuration of activity sources and exclusions.
- Authentication measures: public docs cover OAuth 2.0, Salesforce SSO/SAML-adjacent enforcement through the customer's Salesforce identity configuration, connected app controls, and admin-managed settings.

### People.ai Trust & Security / Trust Center materials
Source scope: public/security materials and trust portal references. Last updated: Jun 2026.
- Security certifications: People.ai materials list security and compliance certifications including SOC 2, ISO 27001, ISO 27701, ISO 27017, and CSA STAR where available in the trust/security portal.
- Security process coverage: People.ai security materials support claims around formal security governance, encryption, access control, credential protection, and security review processes.
- Customer-system access: People.ai should not claim broad unmanaged access to customer systems; answer with the narrow integration/access pattern supported by the product and flag for review if the question asks for exact customer-specific access boundaries.

### Uploaded API documentation - REST APIs Overview, Query API, API Key Management
Source scope: uploaded API documentation summaries. Last updated: Jun 2026.
- API availability: API documentation is available for relevant REST/query/API-key workflows.
- Rate limiting: API documentation supports rate limiting as present; REST API guidance references limits in the 100-500 requests/minute range and 5 requests/second where applicable. Flag if an exact endpoint-specific limit is required.
- API documentation coverage: uploaded docs cover endpoints, schemas, rate limits, authentication/authorization, and API key management.
- API keys: API key management docs indicate secrets are shown once, keys can be paused/revoked, API key access is admin-controlled, and keys should not be hardcoded.

### Victor Chang / CISO confirmation
Source scope: direct security leadership confirmation. Last updated: Jun 2026.
- CISO identity: Victor Chang is the referenced CISO/security leader for security questionnaire escalation and confirmation.
- Sensitive information filters: sensitive information filters may be intentionally disabled in specific AI workflow contexts; flag for security/legal review before sending if asked externally.

### SOC 2 Type II / ISO 27001 certification-derived control coverage
Source scope: reasonable inference from holding SOC 2 Type II / ISO 27001-family certifications. Last updated: Jun 2026.
- These certifications support conservative statements that the organization maintains formal security policies, access control practices, personnel security controls, training, vendor/security review processes, vulnerability management, incident/logging practices, and change/security validation controls.
- Use this source only for broad control-family answers. If a question asks for specific policy names, audit dates, named individuals, exact tooling, evidence attachments, or a customer-specific configuration, flag for human validation.
- Certification-derived control areas include: annual security training, confidentiality/NDA controls, background checks, least-privilege/legitimate-need access, named/authorized access, access review, vendor device controls, secure SDLC, injection/XSS/CSRF validation, code validation controls, sandboxing, denial-of-service prevention, third-party library vetting, security logging, prompt/input handling controls, LLM API security checks, parameterized plugin/tool calls, least-privilege plugins, and free-form input safety checks.

### People.ai product knowledge / architecture from public materials
Source scope: public product and architecture materials, excluding Oliver personal/direct chat input. Last updated: Jun 2026.
- Trust portal/security evidence can be provided through the trust portal or under NDA where applicable.
- Data deletion: product/security materials support a 90-day deletion/retention concept where configured or contractually applicable; flag if asked for exact customer-specific deletion timing.
- AI/LLM architecture: People.ai/SalesAI may use both in-house capabilities and commercial LLM providers depending on workflow. Do not name a provider unless present in the live library or source material.
- Customer data and training: customer data should not be used to train, tune, or improve generative AI models unless an explicit approved source says otherwise. Flag any model-training question for review.
- Cvent/customer AI scope: customer data deletion from AI scope and customer data not being used for training should be answered conservatively and flagged when customer-specific.
- Operational continuity: AI compromise or AI-component failure should not be represented as halting all core operations unless the library says so; answer with a conservative business-continuity framing and flag.
- MCP/agentic architecture: AI interactions with other systems through MCP/tooling should be described as controlled, permissioned, parameterized, and monitored when grounded in the project architecture materials; flag exact implementation details.
- LLM over-reliance: answer that human review, grounding, controls, and validation mitigate over-reliance risk when supported by architecture materials.

### Reasonable inference - enterprise LLM deployment best practices and provider defaults
Source scope: conservative inference, not customer-sendable proof. Last updated: Jun 2026.
- Use only when the live library and public/source documentation do not contain a specific answer.
- Suitable topics include data collection checks, model architecture checks, input/output guardrails, pen tests for AI systems, data source classifications, internal policy frameworks, indemnification posture, multiple plugins/MCP architecture, and plugin monitoring.
- Any answer based on this section must be flagged for human validation and should avoid exact commitments, dates, certification claims, customer names, URLs, or legal warranties.
`.trim();
