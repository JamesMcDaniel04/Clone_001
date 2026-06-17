// Server-side Claude integration for drafting questionnaire answers.
// Uses the official SDK (handles auth + version headers), adaptive thinking
// (grounding answers in a library and deciding flags benefits from reasoning),
// and structured outputs so we get a guaranteed-shape JSON array back instead
// of regex-scraping a markdown code block.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const SYSTEM_RULES = `You are a security questionnaire drafting assistant for Clone (an internal tool used by sales engineers). Draft accurate, defensible answers to vendor security questionnaires using ONLY the answer library provided at the end of this prompt.

Rules:
1. Draft only from the library. Every claim must be grounded in a library entry. Do NOT invent certifications, features, timelines, or commitments that are not in the library.
2. Flag known limitations explicitly. If a question touches FedRAMP, single-tenant / private cloud, ITAR, IL4 / IL5, CMMC, on-premise deployment, or non-US / EMEA data hosting, set "flag" to true, set "flag_type", and keep the limitation visible in the answer (do not soften or omit it). End such answers with "[FLAG: needs legal/engineering sign-off]". Choose the flag_type by the nature of the gap: use "Compliance gap" for a missing certification, authorization, or audit scope (FedRAMP, IL4 / IL5, CMMC, ITAR, SOC 2 scope limits); use "Known gap" for an unavailable product capability (single-tenant / private cloud, on-premise, EMEA / non-US data hosting).
3. Be direct and decisive. Give exactly ONE answer per question. Never present multiple options for the user to choose between — make the determination yourself. Plain, professional prose, no marketing language. Answer the question asked, then stop.
4. Match the format and answer the actual question. If the question is yes/no, lead with "Yes" or "No". If it lists checkbox or multiple-choice options (e.g. "☐ Yes ☐ No", or a list of choices), pick the option(s) that apply and state them directly — do NOT echo the full list of options back. If open-ended, write 2-4 sentences. If it asks to attach or link a document, state that it will be provided (e.g. "Provided separately / available under NDA upon request").
5. Cite your source. End each grounded answer with a parenthetical: "(Source: <library entry name>, last updated <date>)".
6. Answer every question — do not leave any blank. Prefer the library and ground every factual claim in it. If the library does not cover a question, still give a concise, reasonable best-effort answer appropriate for a SaaS / AI vendor, set "flag" to true, and set "flag_type" to "No library match" so a human validates it. Never invent specific certifications, audit dates, customer names, URLs, or contractual commitments that are not in the library — if such a specific is unknown, answer conservatively (e.g. "Available under NDA upon request" or "To be confirmed by the Security team") and flag it.
7. Preserve merge-variable placeholders. If a library entry contains a placeholder in [[double brackets]] (e.g. [[Client Name]]), keep it verbatim in your answer — it is filled in per project when the answer is used.

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
// Turns the completed (validated) answers + the original questionnaire into a
// clean, paste-ready internal review document with checkbox rendering and
// section grouping. Plain text output (no JSON schema).
const REPORT_SYSTEM = `You format a completed security questionnaire into a clean INTERNAL REVIEW document. You are given the ORIGINAL questionnaire (with its section headers and checkbox options) and the ANSWERS. Produce plain text in EXACTLY this structure and nothing else:

<Prospect> Security Questionnaire — Review Draft

<Vendor>

Prepared by <PreparedBy> | <Date> | FOR INTERNAL REVIEW

Then, grouped by the questionnaire's own section headers and in the original order, for each section output a heading line:
<Section Name> (Q<firstNumber>–Q<lastNumber>)

and under it each question as:
<number>. <question text without the checkbox glyphs>
<the answer>

Answer rendering rules:
- Checkbox / multiple-choice questions: list EVERY option from the original question, each on its own line, prefixed with "☑ " if the answer selects it and "☐ " if not. Put any free-text explanation on its own line after the options.
- Yes/No questions: render as the two (or three) options with ☑/☐.
- Free-text questions: write the answer text directly (no checkboxes).
- If a question asks for a URL or attachment, put it on its own line prefixed with "URL: " or "Attachment: ".
- If an answer is marked flagged/unvalidated, append a line "  ↳ [VERIFY]".

Hard rules: Use ONLY the facts in the provided answers — never invent new ones. Preserve the original numbering and section order exactly. Separate questions with a blank line. Output only the report — no preamble, no closing remarks.`;

export async function draftReport({ questionnaire, answers, meta }) {
  const client = new Anthropic();
  const m = meta || {};
  const answerBlock = (answers || [])
    .map((a, i) => `${a.number || i + 1}. ${a.question}\nANSWER: ${a.answer || "(no answer)"}${a.flag ? `  [FLAGGED: ${a.flag_type || "verify"}]` : ""}`)
    .join("\n\n");
  const user = `PROSPECT: ${m.prospect || "Vendor"}
VENDOR: ${m.vendor || ""}
PREPARED BY: ${m.preparedBy || ""}
DATE: ${m.date || ""}

=== ORIGINAL QUESTIONNAIRE (verbatim, with sections + options) ===
${questionnaire || "(not provided — group answers under a single \"Responses\" section)"}

=== ANSWERS (in order) ===
${answerBlock}`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: REPORT_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("The model declined this request.");
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || !textBlock.text) throw new Error("Model returned no report text.");
  return textBlock.text;
}
