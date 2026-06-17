// POST /api/draft  { questions: string[], prospect: string }
// → { answers: [...] }  (see api/_lib/anthropic.js for the answer shape)
//
// Grounds Claude on the live Supabase library; falls back to the published Google
// Doc / bundled library when Supabase isn't configured or is empty.

import { getDbLibrary } from "./_lib/supabaseAdmin.js";
import { getLibrary } from "./_lib/library.js";
import { draftAnswers } from "./_lib/anthropic.js";

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

    // Prefer the library the client read (authenticated session); fall back to the
    // server read, then the bundled library.
    const library = clientLibrary || (await getDbLibrary()) || (await getLibrary()).text;
    const answers = await draftAnswers({ questions, prospect: prospect || "Unknown", library });

    return res.status(200).json({ answers });
  } catch (err) {
    console.error("draft error:", err);
    return res.status(500).json({ error: err.message || "Draft failed" });
  }
}
