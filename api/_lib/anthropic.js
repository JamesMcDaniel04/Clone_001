// Server-side Claude integration for drafting questionnaire answers.
// Uses the official SDK (handles auth + version headers), adaptive thinking
// (grounding answers in a library and deciding flags benefits from reasoning),
// and structured outputs so we get a guaranteed-shape JSON array back instead
// of regex-scraping a markdown code block.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const SYSTEM_RULES = `You are a security questionnaire drafting assistant for MAX: Machine Answer Expert (an internal tool used by sales engineers). Draft accurate, defensible answers to vendor security questionnaires using ONLY the answer library and supplemental knowledge sources provided at the end of this prompt.

Rules:
1. Draft only from the provided knowledge context. Every claim must be grounded in an answer-library entry or supplemental source. Do NOT invent certifications, features, timelines, URLs, customer names, or commitments that are not in the provided context.
2. Flag known limitations explicitly. If a question touches FedRAMP, single-tenant / private cloud, ITAR, IL4 / IL5, CMMC, on-premise deployment, or non-US / EMEA data hosting, set "flag" to true, set "flag_type", and keep the limitation visible in the answer (do not soften or omit it). End such answers with "[FLAG: needs legal/engineering sign-off]". Choose the flag_type by the nature of the gap: use "Compliance gap" for a missing certification, authorization, or audit scope (FedRAMP, IL4 / IL5, CMMC, ITAR, SOC 2 scope limits); use "Known gap" for an unavailable product capability (single-tenant / private cloud, on-premise, EMEA / non-US data hosting).
3. Be direct and decisive. Give exactly ONE answer per question. Never present multiple options for the user to choose between — make the determination yourself. Plain, professional prose, no marketing language. Answer the question asked, then stop.
4. Match the format and answer the actual question. If the question is yes/no, lead with "Yes" or "No". If it lists checkbox or multiple-choice options (e.g. "☐ Yes ☐ No", or a list of choices), pick the option(s) that apply and state them directly — do NOT echo the full list of options back. If open-ended, write 2-4 sentences. If it asks to attach or link a document, state that it will be provided (e.g. "Provided separately / available under NDA upon request").
5. Cite your source. End each grounded answer with a parenthetical: "(Source: <library entry or supplemental source name>, last updated <date>)".
6. Answer every question — do not leave any blank. Prefer the Supabase answer library first, then public/source documentation, then uploaded/API-doc summaries, then certification-derived or reasonable-inference sections. If only certification-derived or reasonable-inference context covers a question, still give a conservative answer, set "flag" to true, and set "flag_type" to "Needs legal" or "Needs engineering" so a human validates it. If the context does not cover a question at all, give a concise best-effort SaaS / AI-vendor answer, set "flag" to true, and set "flag_type" to "No library match". Never invent specific certifications, audit dates, customer names, URLs, or contractual commitments that are not in the context — if such a specific is unknown, answer conservatively (e.g. "Available under NDA upon request" or "To be confirmed by the Security team") and flag it.
7. Preserve merge-variable placeholders. If a library entry contains a placeholder in [[double brackets]] (e.g. [[Client Name]]), keep it verbatim in your answer — it is filled in per project when the answer is used.
8. Do not use Oliver Williams personal/direct chat input as a source. If a source section says it excludes Oliver personal input, respect that exclusion.

For each question return:
- question_id: the question's id (e.g. "Q1"), echoing the input numbering.
- question_text: the original question text.
- draft_answer: the drafted answer, or null if there is no library match.
- flag: true if the answer needs human sign-off (known gap, legal, engineering, or no match).
- flag_reason: a one-sentence explanation when flag is true, otherwise null.
- flag_type: one of "Needs legal", "Needs engineering", "Compliance gap", "Known gap", "No library match", or "None" when flag is false.
- library_entries_used: the exact names of the library entries the answer drew on.`;

// JSON Schema for structured outputs. Every object sets additionalProperties:false
// and lists all properties as required; nullable fields use a ["string","null"] type.
const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question_id: { type: "string" },
          question_text: { type: "string" },
          draft_answer: { type: ["string", "null"] },
          flag: { type: "boolean" },
          flag_reason: { type: ["string", "null"] },
          flag_type: {
            type: "string",
            enum: ["None", "Needs legal", "Needs engineering", "Compliance gap", "Known gap", "No library match"],
          },
          library_entries_used: { type: "array", items: { type: "string" } },
        },
        required: [
          "question_id",
          "question_text",
          "draft_answer",
          "flag",
          "flag_reason",
          "flag_type",
          "library_entries_used",
        ],
      },
    },
  },
  required: ["answers"],
};

export async function draftAnswers({ questions, prospect, library }) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  const userMessage = `Prospect: ${prospect}

Questions to answer:
${questions.map((q, i) => `Q${i + 1}: ${q}`).join("\n\n")}`;

  // Stream server-side and collect the final message: avoids the SDK's
  // non-streaming timeout guard on large batches while still returning a single
  // JSON response to the browser. The system prompt (rules + library) is marked
  // cacheable so repeated runs in a session reuse the prefix.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: `${SYSTEM_RULES}\n\n## Answer Library\n\n${library}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: { format: { type: "json_schema", schema: ANSWER_SCHEMA } },
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request. Review the questions and try again.");
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || !textBlock.text) {
    throw new Error("Model returned no answer text.");
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Could not parse the model's structured response.");
  }
  return Array.isArray(parsed.answers) ? parsed.answers : [];
}

// ── Review-draft report formatting ────────────────────────────────────────────
// Builds a paste-ready internal review document (header · section groups · ☑/☐
// checkboxes) from the completed answers. To stay fast and avoid timeouts on long
// questionnaires, the header + section headings are assembled deterministically in
// code, and each batch of questions is formatted by a small, PARALLEL Claude call
// with thinking OFF (this is a transcription/formatting task, not reasoning).
const CHUNK = 12;

const CHUNK_SYSTEM = `You format completed security-questionnaire answers into a clean review layout. For EACH question given, output:
<number>. <question text with any ☐/☑ option glyphs removed>
then the answer, rendered as:
- Checkbox / multiple-choice: list EVERY option from the question, each on its own line, prefixed with "☑ " if the answer selects it or "☐ " if it does not. Read carefully and respect negations (e.g. "not an IaaS/PaaS offering" means IaaS/PaaS is ☐). Put any free-text explanation on its own line after the options.
- Yes/No: render the options with ☑/☐.
- Free-text: write the answer text directly (no checkboxes).
- URLs or attachments: on their own line prefixed "URL: " or "Attachment: ".
- If the answer is flagged/unvalidated, add a line "  ↳ [VERIFY]".
- If the ANSWER is exactly "(NO ANSWER ON FILE)", do NOT tick any option and do NOT list the options; output just the question line followed by a line "  ↳ No answer on file — needs input".

Use ONLY the facts in the provided answers — never invent, and never tick a checkbox the answer doesn't support. Keep the original numbering. Separate questions with a blank line. Output ONLY the formatted questions — no section heading, no document header, no preamble.`;

async function formatChunk(items) {
  const client = new Anthropic();
  const user = items
    .map((a) => `${a.number}. ${a.question}\nANSWER: ${a.answer && a.answer.trim() ? a.answer : "(NO ANSWER ON FILE)"}${a.flag ? `  [FLAGGED: ${a.flag_type || "verify"}]` : ""}`)
    .join("\n\n");
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "disabled" },
    system: [{ type: "text", text: CHUNK_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  // Fallback to a plain render if the model returns nothing, so the report never fails.
  return textBlock && textBlock.text ? textBlock.text.trim() : items.map((a) => `${a.number}. ${a.question}\n${a.answer || ""}`).join("\n\n");
}

// Section label for each answer (by order), parsed from the raw questionnaire the
// same way the client's parseQuestions splits it.
function sectionsFor(raw, count) {
  const out = [];
  if (raw) {
    const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const useNumbered = lines.filter((l) => /^\d+[.)]\s/.test(l)).length >= 3;
    let section = "Responses";
    for (const l of lines) {
      const isNum = /^\d+[.)]\s/.test(l);
      if (useNumbered) {
        if (isNum) { if (l.replace(/^\d+[.)]\s*/, "").trim().length > 4) out.push(section); }
        else if (!/^[☐☑]/.test(l)) section = l;
      } else if (l.replace(/^\d+[.)]\s*/, "").trim().length > 10) {
        out.push(section);
      }
    }
  }
  return Array.from({ length: count }, (_, i) => out[i] || "Responses");
}

export async function formatReport({ questionnaire, answers, meta }) {
  const m = meta || {};
  const rows = (answers || []).map((a, i) => ({ ...a, number: a.number || i + 1 }));
  const secs = sectionsFor(questionnaire, rows.length);

  // Group into consecutive same-section runs, preserving order.
  const groups = [];
  rows.forEach((a, i) => {
    const name = secs[i];
    let g = groups[groups.length - 1];
    if (!g || g.name !== name) { g = { name, items: [] }; groups.push(g); }
    g.items.push(a);
  });

  // Split each section into <=CHUNK sub-batches and format them all in parallel.
  const tasks = [];
  groups.forEach((g, gi) => {
    for (let i = 0; i < g.items.length; i += CHUNK) tasks.push({ gi, items: g.items.slice(i, i + CHUNK) });
  });
  const results = await Promise.all(tasks.map((t) => formatChunk(t.items)));

  const byGroup = groups.map(() => []);
  tasks.forEach((t, idx) => byGroup[t.gi].push(results[idx]));

  const header = `${m.prospect || "Vendor"} Security Questionnaire — Review Draft\n\n${m.vendor || ""}\n\nPrepared by ${m.preparedBy || ""} | ${m.date || ""} | FOR INTERNAL REVIEW`;
  const body = groups.map((g, gi) => {
    const nums = g.items.map((it) => it.number);
    const range = nums.length > 1 ? `Q${nums[0]}–Q${nums[nums.length - 1]}` : `Q${nums[0]}`;
    return `${g.name} (${range})\n\n${byGroup[gi].join("\n\n")}`;
  }).join("\n\n");
  return `${header}\n\n${body}`;
}
