// GET /api/library → { library: string, source: "drive" | "fallback" }
// Used by the UI to show where the library was loaded from. The draft endpoint
// fetches the library itself (authoritatively) rather than trusting the client.

import { getLibrary } from "./_lib/library.js";

export default async function handler(req, res) {
  try {
    const { text, source } = await getLibrary();
    return res.status(200).json({ library: text, source });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Library fetch failed" });
  }
}
