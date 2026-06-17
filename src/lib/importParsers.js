// File parsing for the Import flow. Heavy libraries (xlsx, mammoth, pdfjs) are
// dynamically imported so they're code-split and only load when a file is picked.

export function fileKind(name = "") {
  const n = name.toLowerCase();
  if (/\.(xlsx|xls|xlsm)$/.test(n)) return "excel";
  if (/\.csv$/.test(n)) return "csv";
  if (/\.docx$/.test(n)) return "docx";
  if (/\.pdf$/.test(n)) return "pdf";
  if (/\.(txt|md|text)$/.test(n)) return "text";
  return "unknown";
}

// ── Spreadsheets ────────────────────────────────────────────────────────────
// Returns { headers: string[], data: string[][] } from the first sheet.
export async function readSheet(file) {
  const XLSX = await import("xlsx");
  const isCsv = fileKind(file.name) === "csv";
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: "string" })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (!rows.length) return { headers: [], data: [] };

  const first = rows[0].map((c) => (c == null ? "" : String(c)));
  const looksHeader = first.length > 0 && first.every((c) => c.length > 0 && c.length < 48);
  const headers = looksHeader ? first : first.map((_, i) => `Column ${i + 1}`);
  const data = (looksHeader ? rows.slice(1) : rows).map((r) => r.map((c) => (c == null ? "" : String(c))));
  return { headers, data };
}

// Best guess at which column holds the questions: a header containing "question",
// else the column with the longest average text.
export function guessQuestionColumn(headers, data) {
  const byName = headers.findIndex((h) => /question|query|ask|requirement/i.test(h));
  if (byName >= 0) return byName;
  let best = 0, bestLen = -1;
  for (let c = 0; c < headers.length; c++) {
    const avg = data.reduce((s, r) => s + (r[c] || "").length, 0) / Math.max(data.length, 1);
    if (avg > bestLen) { bestLen = avg; best = c; }
  }
  return best;
}

export function columnValues(data, colIndex) {
  return data.map((r) => (r[colIndex] || "").trim()).filter((s) => s.length > 3);
}

// ── Documents ───────────────────────────────────────────────────────────────
export async function readDocx(file) {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value || "";
}

export async function readPdf(file) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((i) => i.str).join(" ") + "\n";
  }
  return text;
}

export async function readTextFile(file) {
  return await file.text();
}

// Split free text into candidate questions: one per line / numbered item.
export function splitQuestions(text) {
  return (text || "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
    .filter((l) => l.length > 10);
}

// Extract questions from any supported source document.
export async function extractFromDocument(file) {
  const kind = fileKind(file.name);
  let text = "";
  if (kind === "docx") text = await readDocx(file);
  else if (kind === "pdf") text = await readPdf(file);
  else if (kind === "text") text = await readTextFile(file);
  else throw new Error("Unsupported document type. Use .docx, .pdf, or .txt.");
  return splitQuestions(text);
}

// ── Template download (matches the "Excel (Empty)/(Sample)" buttons) ─────────
export async function downloadTemplate(withSamples) {
  const XLSX = await import("xlsx");
  const aoa = withSamples
    ? [
        ["Section", "Question"],
        ["Authentication", "Do you support SSO via SAML 2.0?"],
        ["Compliance", "Are you SOC 2 Type II certified?"],
        ["Infrastructure", "Is your platform FedRAMP authorized?"],
      ]
    : [["Section", "Question"]];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  XLSX.writeFile(wb, withSamples ? "max-import-sample.xlsx" : "max-import-template.xlsx");
}
