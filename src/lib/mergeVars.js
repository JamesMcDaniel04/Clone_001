// Merge variables are reusable [[tokens]] you drop into answers and resolve per
// project. Library entries stay generic (store the token); drafts/exports show the
// resolved value. Loopio-style: maintain once, substitute everywhere.

const norm = (s) => (s || "").toLowerCase().replace(/\s*\(default\)\s*$/i, "").trim();

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
    return text.replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (whole, name) => {
      const hit = map.get(norm(name));
      return hit ? hit : whole; // leave unknown tokens visible
    });
  }
  // Names actually used in a body (for "Times Used" / indicators)
  function tokensIn(text) {
    const out = new Set();
    for (const m of (text || "").matchAll(/\[\[\s*([^\]]+?)\s*\]\]/g)) {
      if (map.has(norm(m[1]))) out.add(norm(m[1]));
    }
    return [...out];
  }
  return { resolve, tokensIn, hasAny: map.size > 0 };
}
