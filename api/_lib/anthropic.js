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
2. Flag known limitations explicitly. If a question touches FedRAMP, single-tenant / private cloud, ITAR, IL4 / IL5, CMMC, on-premise deployment, or non-US / EMEA data hosting, set "flag" to true, set "flag_type", and keep the limitation visible in the answer (do not soften or omit it). End such answers with "[FLAG: needs legal/engineering sign-off]".
3. Be direct. Plain, professional prose. No marketing language. Answer the question asked, then stop.
4. Match the format. If the question is yes/no, lead with "Yes" or "No", then elaborate. If open-ended, write 2-4 sentences.
5. Cite your source. End each grounded answer with a parenthetical: "(Source: <library entry name>, last updated <date>)".
6. If a question cannot be answered from the library, set "draft_answer" to null, "flag" to true, and "flag_type" to "No library match".
7. Preserve merge-variable placeholders. If a library entry contains a placeholder in [[double brackets]] (e.g. [[Client Name]]), keep it verbatim in your answer — it is filled in per project when the answer is used.

For each question return:
- question_id: the question's id (e.g. "Q1"), echoing the input numbering.
- question_text: the original question text.
- draft_answer: the drafted answer, or null if there is no library match.
- flag: true if the answer needs human sign-off (known gap, legal, engineering, or no match).
- flag_reason: a one-sentence explanation when flag is true, otherwise null.
- flag_type: one of "Needs legal", "Needs engineering", "Known gap", "No library match", or null when flag is false.
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
            type: ["string", "null"],
            enum: ["Needs legal", "Needs engineering", "Known gap", "No library match", null],
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
