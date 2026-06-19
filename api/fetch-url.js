// POST /api/fetch-url  { url: string }
// → { title, text, source_url, content_type }
//
// Fetches a public web page server-side (the browser can't, due to CORS) and
// extracts its readable text so it can be saved into the library as knowledge
// content. HTML is stripped to text; plain-text / markdown is passed through.
// PDFs are rejected with a hint to upload the file (we parse those in the browser).

const MAX_BYTES = 6 * 1024 * 1024;       // cap the fetched body
const MAX_TEXT = 200_000;                // cap stored text (keeps DB + grounding sane)
const FETCH_TIMEOUT_MS = 20_000;
const NUL = String.fromCharCode(0);      // Postgres text columns reject NUL bytes

// Block non-http(s) and private / loopback / link-local hosts (basic SSRF guard).
function isSafeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;
  if (/^127\./.test(host) || /^10\./.test(host) || /^169\.254\./.test(host) || /^0\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#34": '"' };
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z0-9#]+);/gi, (m, name) => (ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m));
}
function safeChar(code) {
  try { return Number.isFinite(code) ? String.fromCodePoint(code) : ""; } catch { return ""; }
}

function htmlToText(html) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // Turn block-level boundaries into newlines so paragraphs survive.
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|section|article|header|footer|li|tr|h[1-6]|ul|ol|table|blockquote)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s
    .replace(/[\t\f\v\r ]+/g, " ")
    .replace(/[\t ]*\n[\t ]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html, url) {
  const og = html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i);
  if (og) return decodeEntities(og[1]).replace(/\s+/g, " ").trim();
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t && t[1].trim()) return decodeEntities(t[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  try { const u = new URL(url); return (u.hostname + u.pathname).replace(/\/$/, ""); } catch { return url; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const url = (req.body?.url || "").trim();
  if (!url) return res.status(400).json({ error: "Provide a 'url'." });
  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: "Enter a valid public http(s) URL." });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MAX-LibraryBot/1.0; +knowledge-import)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });
  } catch (e) {
    clearTimeout(timer);
    return res.status(502).json({ error: e.name === "AbortError" ? "The page took too long to load." : `Could not fetch that URL: ${e.message}` });
  }
  clearTimeout(timer);

  if (!resp.ok) {
    return res.status(502).json({ error: `The page returned HTTP ${resp.status}.` });
  }

  const contentType = (resp.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/pdf")) {
    return res.status(415).json({ error: "That URL is a PDF — download it and upload the file directly." });
  }
  const declaredLen = Number(resp.headers.get("content-length") || 0);
  if (declaredLen && declaredLen > MAX_BYTES) {
    return res.status(413).json({ error: "That page is too large to import." });
  }

  let body;
  try { body = await resp.text(); } catch (e) { return res.status(502).json({ error: `Could not read the page: ${e.message}` }); }
  if (body.length > MAX_BYTES) body = body.slice(0, MAX_BYTES);

  const isHtml = contentType.includes("html") || /^\s*<(?:!doctype|html)/i.test(body);
  let text;
  let title;
  if (isHtml) {
    text = htmlToText(body);
    title = extractTitle(body, url);
  } else if (contentType.includes("text") || contentType.includes("json") || contentType.includes("markdown") || !contentType) {
    text = body.replace(/\r\n/g, "\n").trim();
    title = extractTitle("", url);
  } else {
    return res.status(415).json({ error: `Unsupported content type (${contentType || "unknown"}). Upload the file directly instead.` });
  }

  text = text.split(NUL).join("");
  if (!text || text.length < 20) {
    return res.status(422).json({ error: "No readable text could be extracted from that page." });
  }
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

  return res.status(200).json({ title, text, source_url: url, content_type: contentType });
}
