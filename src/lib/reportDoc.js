// Renders the plain-text review report (header · sections · ☑/☐ · answers) into a
// styled, print-to-PDF HTML document that mirrors the uploaded sample: centered
// header, blue underlined section headings, green ☑ / grey ☐ options, green-
// highlighted free-text answers, and URL/Attachment chips. Opening it in a tab and
// hitting "Save as PDF" produces the PDF deliverable.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function reportToHtml(text, meta = {}) {
  const lines = (text || "").split("\n");
  const blocks = [];
  let answerBuf = [];
  const flush = () => {
    if (answerBuf.length) {
      blocks.push(`<div class="answer">${answerBuf.map(esc).join("<br>")}</div>`);
      answerBuf = [];
    }
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { flush(); continue; }
    if (/Review Draft\s*$/.test(t)) continue;                 // title comes from meta
    if (/^Prepared by /i.test(t)) continue;                   // prepared line from meta
    if (meta.vendor && t === String(meta.vendor).trim()) continue; // vendor from meta
    if (/\(Q\d+(?:[–-]Q\d+)?\)\s*$/.test(t)) { flush(); blocks.push(`<h2>${esc(t)}</h2>`); continue; }
    const qm = t.match(/^(\d+[.)])\s*(.*)$/);
    if (qm && !/^☑|^☐/.test(t)) { flush(); blocks.push(`<div class="q"><span class="qn">${esc(qm[1])}</span> ${esc(qm[2])}</div>`); continue; }
    if (/^☑\s*/.test(t)) { flush(); blocks.push(`<div class="opt sel"><span class="g">☑</span> ${esc(t.replace(/^☑\s*/, ""))}</div>`); continue; }
    if (/^☐\s*/.test(t)) { flush(); blocks.push(`<div class="opt"><span class="g">☐</span> ${esc(t.replace(/^☐\s*/, ""))}</div>`); continue; }
    if (/^URL:/i.test(t)) { flush(); blocks.push(`<div class="chip">${esc(t)}</div>`); continue; }
    if (/^Attachment:/i.test(t)) { flush(); blocks.push(`<div class="chip">${esc(t)}</div>`); continue; }
    if (/\[VERIFY\]/.test(t) || /↳/.test(t) || /needs input/i.test(t)) { flush(); blocks.push(`<div class="verify">⚠ ${esc(t.replace(/^↳\s*/, "").replace(/^⚠\s*/, ""))}</div>`); continue; }
    answerBuf.push(t);
  }
  flush();

  const title = `${meta.prospect || "Vendor"} Security Questionnaire — Review Draft`;
  const styles = `
    @page { margin: 2.2cm 1.9cm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; background: #ECEDEF; }
    .toolbar { position: sticky; top: 0; display: flex; gap: 10px; align-items: center; background: #fff; border-bottom: 1px solid #e2e2e6; padding: 10px 16px; }
    .toolbar button { background: #2E5090; color: #fff; border: none; border-radius: 7px; padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .toolbar span { color: #666; font-size: 12.5px; }
    .doc { max-width: 820px; margin: 22px auto; background: #fff; padding: 52px 60px; box-shadow: 0 1px 8px rgba(0,0,0,.12); }
    .title { text-align: center; font-size: 22px; font-weight: 700; color: #2E5090; margin-bottom: 6px; }
    .vendor { text-align: center; font-size: 15px; color: #666; margin-bottom: 6px; }
    .prepared { text-align: center; font-size: 13px; font-weight: 700; color: #CC0000; margin: 0 0 8px; }
    h2 { font-size: 18px; color: #2E5090; border-bottom: 1px solid #2E5090; padding-bottom: 4px; margin: 30px 0 12px; }
    .q { font-weight: 700; font-size: 14.5px; margin: 16px 0 6px; }
    .q .qn { color: #2E5090; }
    .opt { margin: 2px 0 2px 18px; font-size: 13.5px; color: #666; }
    .opt .g { color: #999; }
    .opt.sel { color: #000; font-weight: 700; }
    .opt.sel .g { color: #2E7D32; }
    .answer { margin: 6px 0 8px 18px; background: #E8F5E9; padding: 9px 13px; border-radius: 4px; font-size: 13.5px; line-height: 1.55; }
    .chip { margin: 4px 0 8px 18px; background: #F4F4F5; padding: 7px 11px; border-radius: 4px; font-size: 12.5px; word-break: break-all; }
    .verify { margin: 2px 0 8px 18px; font-size: 12px; color: #9A6A00; }
    @media print { .toolbar { display: none; } body { background: #fff; } .doc { box-shadow: none; margin: 0; max-width: none; padding: 0; } h2, .q { break-after: avoid; } .answer, .opt { break-inside: avoid; } }
  `;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${styles}</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">Save as PDF</button><span>Use your browser's print dialog → "Save as PDF".</span></div>
  <div class="doc">
    <div class="title">${esc(title)}</div>
    <div class="vendor">${esc(meta.vendor || "")}</div>
    <div class="prepared">Prepared by ${esc(meta.preparedBy || "")} | ${esc(meta.date || "")} | FOR INTERNAL REVIEW</div>
    ${blocks.join("\n    ")}
  </div>
</body></html>`;
}
