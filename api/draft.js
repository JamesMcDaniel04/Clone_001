// POST /api/draft  { questions: string[], prospect: string }
// → { answers: [...] }  (see api/_lib/anthropic.js for the answer shape)
//
// Grounds Claude on the live Supabase library; falls back to the published Google
// Doc / bundled library when Supabase isn't configured or is empty.

import { getDbLibrary } from "./_lib/supabaseAdmin.js";
import { getLibrary } from "./_lib/library.js";
import { getSupplementalSources } from "./_lib/sources.js";
import { draftAnswers } from "./_lib/anthropic.js";

// Safety valve so one request can't run long enough to hit the serverless timeout.
// The frontend batches the full questionnaire into chunks below this — there is no
// limit on the total number of questions a user can upload.
const MAX_QUESTIONS_PER_REQUEST = 10;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  try {
    const { questions, prospect, library: clientLibrary } = req.body || {};
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Provide a non-empty 'questions' array." });
    }
    if (questions.length > MAX_QUESTIONS_PER_REQUEST) {
      return res.status(413).json({ error: `This drafting request had ${questions.length} questions; each request handles up to ${MAX_QUESTIONS_PER_REQUEST}. The app batches automatically — hard-refresh to load the latest version.` });
    }

    // Prefer the library the client read (authenticated session); fall back to the
    // server read, then the bundled library. Always append supplemental sources:
    // public People.ai docs, configured URLs, uploaded/API-doc summaries, CISO/security
    // confirmation, certification-derived controls, and conservative inference rules.
    const primaryLibrary = clientLibrary || (await getDbLibrary()) || (await getLibrary()).text;
    const supplementalSources = await getSupplementalSources();
    const library = [primaryLibrary, supplementalSources].filter(Boolean).join("\n\n");
    const answers = await draftAnswers({ questions, prospect: prospect || "Unknown", library });

    return res.status(200).json({ answers });
  } catch (err) {
    console.error("draft error:", err);
    return res.status(500).json({ error: err.message || "Draft failed" });
  }
}
