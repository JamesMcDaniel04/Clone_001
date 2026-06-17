// POST /api/report  { questionnaire?: string, answers: [{number?, question, answer, flag?, flag_type?}], meta: {prospect, vendor, preparedBy, date} }
// → { report: string }  — a formatted internal review draft (checkbox rendering + section grouping).

import { draftReport } from "./_lib/anthropic.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }
  try {
    const { questionnaire, answers, meta } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Provide a non-empty 'answers' array." });
    }
    const report = await draftReport({ questionnaire, answers, meta });
    return res.status(200).json({ report });
  } catch (err) {
    console.error("report error:", err);
    return res.status(500).json({ error: err.message || "Report failed" });
  }
}
