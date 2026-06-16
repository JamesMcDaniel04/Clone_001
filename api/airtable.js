// POST /api/airtable  { action: "create" | "update", table, fields, recordId? }
// Proxies Airtable writes so the token + base id stay server-side and the created
// record id is returned to the client (so later status/edit PATCHes work).
//
// `table` is a logical key — the real table name is resolved from env here, so
// renaming a table is a server-only change.

const API = "https://api.airtable.com/v0";

function tableName(key) {
  const map = {
    questionnaires: process.env.AIRTABLE_QUESTIONNAIRES_TABLE || "Questionnaires",
    questions: process.env.AIRTABLE_QUESTIONS_TABLE || "Questions",
    library: process.env.AIRTABLE_LIBRARY_TABLE || "Answer Library",
    flags: process.env.AIRTABLE_FLAGS_TABLE || "Flags log",
  };
  return map[key];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE;

  // Airtable is optional. If it isn't configured, report a soft skip so the UI
  // keeps working (drafting + export don't need history).
  if (!token || !base) {
    return res.status(200).json({ skipped: true, reason: "Airtable not configured" });
  }

  const { action, table, recordId, fields } = req.body || {};
  const name = tableName(table);
  if (!name) return res.status(400).json({ error: `Unknown table key: ${table}` });
  if (!fields || typeof fields !== "object") {
    return res.status(400).json({ error: "Require a 'fields' object" });
  }

  try {
    const tableUrl = `${API}/${base}/${encodeURIComponent(name)}`;
    let url = tableUrl;
    let method = "POST";

    if (action === "update") {
      if (!recordId) return res.status(400).json({ error: "update requires recordId" });
      url = `${tableUrl}/${recordId}`;
      method = "PATCH";
    } else if (action !== "create") {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const r = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // typecast lets Airtable coerce/create select options it doesn't recognize.
      body: JSON.stringify({ fields, typecast: true }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.error?.message || "Airtable error", details: data?.error });
    }

    return res.status(200).json({ id: data.id, fields: data.fields });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Airtable request failed" });
  }
}
