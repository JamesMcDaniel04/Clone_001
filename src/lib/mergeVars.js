// Merge variables are reusable [[tokens]] you drop into answers and resolve per
// project. Library entries stay generic (store the token); drafts/exports show the
// resolved value. Loopio-style: maintain once, substitute everywhere.

// Normalize a token/variable name so spelling variants collapse to one key:
// camelCase, snake_case, kebab-case, extra spaces, punctuation, and a trailing
// "(default)" all resolve to the same thing. So [[Client Name]], [[client_name]],
// [[clientName]] and [[Client  Name]] are equivalent.
export const norm = (s) =>
  (s || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // split camelCase before lowercasing
    .toLowerCase()
    .replace(/\s*\(default\)\s*$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ") // drop punctuation
    .replace(/\s+/g, " ")
    .trim();

const TOKEN_RE = /\[\[\s*([^\]]+?)\s*\]\]/g;

// Build a resolver from the merge-variable rows + the current project.
// "Project"-type variables resolve to the project's client/prospect; others use their value.
export function buildResolver(variables, project) {
  const client = project?.prospect || "";
  const map = new Map([
    ["client name", client],
    ["client", client],
    ["prospect", client],
    ["company", client],
  ]);
  for (const v of variables || []) {
    const resolved = v.type === "Project" ? client : (v.value || "");
    if (resolved) map.set(norm(v.name), resolved);
  }

  function resolve(text) {
    if (!text) return text;
    return text.replace(TOKEN_RE, (whole, name) => {
      const hit = map.get(norm(name));
      return hit ? hit : whole; // leave unknown tokens visible
    });
  }
  // Known variable names actually used in a body (for "Used" counts / indicators).
  function tokensIn(text) {
    const out = new Set();
    for (const m of (text || "").matchAll(TOKEN_RE)) {
      if (map.has(norm(m[1]))) out.add(norm(m[1]));
    }
    return [...out];
  }
  // [[tokens]] present in the body that DON'T resolve — these would ship raw to a
  // customer, so callers surface them as a warning before sending/exporting.
  function unresolvedTokensIn(text) {
    const out = new Set();
    for (const m of (text || "").matchAll(TOKEN_RE)) {
      if (!map.has(norm(m[1]))) out.add(m[1].trim());
    }
    return [...out];
  }
  return { resolve, tokensIn, unresolvedTokensIn, knownNames: [...map.keys()], hasAny: map.size > 0 };
}
