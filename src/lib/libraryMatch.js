// Lightweight client-side relevance match between a question and the answer
// library. Used to show the live "Library matched" step while Claude drafts —
// the model returns the authoritative `library_entries_used` afterward, but this
// gives an immediate, data-driven preview of which entries are likely in play.

const STOP = new Set([
  "the", "and", "for", "are", "you", "your", "with", "that", "this", "have", "has",
  "does", "did", "can", "any", "our", "from", "into", "what", "which", "when", "how",
  "who", "will", "would", "should", "could", "they", "their", "them", "but", "not",
  "all", "use", "used", "using", "via", "per", "support", "supported", "provide",
  "please", "describe", "list", "explain", "detail", "details", "platform", "vendor",
  "company", "organization", "service", "services", "data", "system", "systems",
]);

function tokens(s) {
  return (s || "").toLowerCase().match(/[a-z0-9]+/g) || [];
}

function keywordSet(s) {
  return new Set(tokens(s).filter((w) => w.length > 3 && !STOP.has(w)));
}

// Returns the top `limit` library entries (whole objects) most relevant to the
// question, scored by distinct keyword overlap against each entry's question+answer.
export function matchLibraryEntries(question, entries, limit = 4) {
  const qset = keywordSet(question);
  if (!qset.size || !entries?.length) return [];
  const scored = [];
  for (const e of entries) {
    const eset = keywordSet(`${e.question} ${e.answer || ""}`);
    let score = 0;
    for (const w of qset) if (eset.has(w)) score++;
    if (score > 0) scored.push({ entry: e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);
}
