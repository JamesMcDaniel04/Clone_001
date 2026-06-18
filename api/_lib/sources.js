import { SOURCE_COVERAGE } from "./sourceCoverage.js";

const DEFAULT_URLS = [
  "https://setup.people.ai/",
  "https://help.people.ai/en/",
  "https://help.people.ai/en/articles/8834587-common-security-and-privacy-questions",
  "https://setup.people.ai/salesforce-integration/salesforce-integration",
  "https://setup.people.ai/salesforce-integration/best-practices-and-recommendations",
  "https://people.ai/product/trust-security",
];

let cached;
let cachedAt = 0;
const CACHE_MS = 30 * 60 * 1000;

function configuredUrls() {
  const raw = process.env.KNOWLEDGE_SOURCE_URLS || "";
  const extra = raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const defaults = process.env.FETCH_DEFAULT_KNOWLEDGE_SOURCE_URLS === "true" ? DEFAULT_URLS : [];
  return [...new Set([...defaults, ...extra])];
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSource(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "MAXSourceFetcher/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = htmlToText(await res.text()).slice(0, 16000);
    if (!text) return null;
    return `### Live source: ${url}\n${text}`;
  } catch (err) {
    return `### Live source unavailable: ${url}\nFetch failed during drafting context assembly (${err.message}). Use bundled/source-library coverage instead.`;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSupplementalSources() {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) return cached;

  const urls = configuredUrls();
  const fetched = urls.length ? await Promise.all(urls.map(fetchSource)) : [];
  cached = [
    SOURCE_COVERAGE,
    urls.length ? "## Live Public / Configured Source Fetches" : "",
    ...fetched.filter(Boolean),
  ].filter(Boolean).join("\n\n");
  cachedAt = now;
  return cached;
}
