import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { getProject, getProjectEntries, insertProjectEntries, updateProjectEntry, deleteProjectEntry, createEntry, listMergeVariables, updateProject, getLibraryEntries, libraryTextFromEntries, listCategories, getKnowledgeEntries } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Modal, Field, Input, Select } from "../../components/ui.jsx";
import Stepper from "../../components/Stepper.jsx";
import QuestionCard from "../../components/QuestionCard.jsx";
import ImportModal from "../../components/ImportModal.jsx";
import { buildResolver } from "../../lib/mergeVars.js";
import { matchLibraryEntries } from "../../lib/libraryMatch.js";
import { reportToHtml } from "../../lib/reportDoc.js";
import { IconBook } from "../../components/icons.jsx";

function parseQuestions(raw) {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const numbered = lines.filter((l) => /^\d+[.)]\s/.test(l));
  // Numbered questionnaire ("1. …", "2) …"): keep the numbered items and drop
  // section headers / unnumbered context, so we get exactly one question per item.
  if (numbered.length >= 3) {
    return numbered.map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter((l) => l.length > 4);
  }
  // Otherwise treat each substantial line as a question.
  return lines.map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter((l) => l.length > 10);
}
function statusFromDraft(d) {
  if (!d.flag) return "approved";
  if (d.flag_type === "Needs engineering") return "needs_engineering";
  // No-match answers are best-effort drafts to validate (only "withheld" when truly blank).
  if (d.flag_type === "No library match") return d.draft_answer ? "needs_legal" : "withheld";
  return "needs_legal";
}

const DRAFT_BATCH_SIZE = 6;   // questions per serverless call (≤ server's MAX_QUESTIONS_PER_REQUEST)
const DRAFT_CONCURRENCY = 6;  // batches drafted in parallel — the whole questionnaire runs in a few waves
const MATCHES_PER_QUESTION = 6;

export default function Project() {
  const { id } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState(null);
  const [raw, setRaw] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | drafting
  const [err, setErr] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [mergeVars, setMergeVars] = useState([]);
  const [templateEntryOpen, setTemplateEntryOpen] = useState(false);
  const [libEntries, setLibEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [draftScope, setDraftScope] = useState({ id: "all", name: "Full library" });
  const [libraryLabel, setLibraryLabel] = useState("Full library");
  const [matches, setMatches] = useState([]); // [{ question, entries }] shown live while drafting
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [draftProgress, setDraftProgress] = useState(null); // { done, total } while batching

  useEffect(() => {
    getProject(id).then(setProject).catch((e) => setErr(e.message));
    getProjectEntries(id).then(setEntries).catch((e) => setErr(e.message));
    listMergeVariables().then(setMergeVars).catch(() => {});
    getLibraryEntries().then(setLibEntries).catch(() => {});
    listCategories().then(setCategories).catch(() => {});
  }, [id]);

  // Derive an answer's category from the question itself, using the same
  // deterministic matcher that drives the live "Library matched" step — the
  // dominant category among the top matched library entries. Robust across
  // reloads (depends only on the persisted question + the live library).
  function categoryForEntry(q) {
    const matched = matchLibraryEntries(q.question, libEntries);
    if (!matched.length) return "Vendor security";
    const counts = {};
    for (const e of matched) { const c = e.category?.name; if (c) counts[c] = (counts[c] || 0) + 1; }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "Vendor security";
  }

  // Pre-fill the draft box from a template's questions (passed via navigation state).
  useEffect(() => {
    const pre = location.state?.prefillQuestions;
    if (pre && pre.length) setRaw(pre.join("\n"));
  }, []);

  async function saveAsTemplate() {
    try {
      const updated = await updateProject(id, { is_template: true });
      setProject(updated);
      setExportMsg("Saved as a template — it'll appear under Available Templates when creating a project.");
      setTimeout(() => setExportMsg(null), 3500);
    } catch (e) { setErr(e.message); }
  }

  async function publishTemplate() {
    try {
      const updated = await updateProject(id, { is_template: true, status: "approved" });
      setProject(updated);
      setExportMsg("Project template published.");
      setTimeout(() => setExportMsg(null), 3000);
    } catch (e) { setErr(e.message); }
  }

  function downloadTemplate() {
    const lines = (entries || []).map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    const blob = new Blob([lines || `${project?.name || "Template"}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project?.name || "template"}_template.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  // Resolve [[merge variable]] tokens against this project (client name, etc.).
  const { resolve: resolveMV } = buildResolver(mergeVars, project);

  async function handleDraft() {
    const parsed = parseQuestions(raw);
    if (!parsed.length) return;
    setErr(null);

    // Scope the library to the chosen category (or the whole library) and surface
    // the matched entries live while Claude drafts — the model returns the
    // authoritative library_entries_used afterward.
    const scoped = draftScope.id === "all" ? libEntries : libEntries.filter((e) => e.category_id === draftScope.id);
    setMatches(parsed.map((q) => ({ question: q, entries: matchLibraryEntries(q, scoped) })));
    setLibraryLabel(draftScope.name);
    // Persist the original questionnaire (sections + checkbox options) so the
    // review-draft report can render it faithfully later.
    updateProject(id, { notes: raw }).then(setProject).catch(() => {});
    setDraftProgress({ done: 0, total: parsed.length });
    setPhase("drafting");
    try {
      // Fold the knowledge "brain" — uploaded documents + previously approved
      // answers — into the matchable pool so drafting grounds on them too.
      const knowledge = await getKnowledgeEntries().catch(() => []);
      const pool = knowledge.length ? [...scoped, ...knowledge] : scoped;
      // Draft in small batches so each serverless call finishes well under the
      // hosting timeout. Each batch sends only the matched entries for those
      // questions, which keeps the Claude prompt small on Vercel.
      const batches = [];
      for (let i = 0; i < parsed.length; i += DRAFT_BATCH_SIZE) batches.push(parsed.slice(i, i + DRAFT_BATCH_SIZE));
      const results = new Array(batches.length);
      let nextBatch = 0;
      async function worker() {
        while (nextBatch < batches.length) {
          const bi = nextBatch++;
          results[bi] = await draftBatch(batches[bi], batchLibraryForQuestions(batches[bi], pool));
          setDraftProgress((p) => ({ done: Math.min((p?.done || 0) + batches[bi].length, parsed.length), total: parsed.length }));
        }
      }
      await Promise.all(Array.from({ length: Math.min(DRAFT_CONCURRENCY, batches.length) }, worker));

      // Build rows per batch so a short/long batch never misaligns later questions.
      // Use the ORIGINAL question text (keeps checkbox options for the report).
      const rows = [];
      let pos = 0;
      batches.forEach((batchQs, bi) => {
        const ans = results[bi] || [];
        batchQs.forEach((qText, j) => {
          const d = ans[j] || {
            question_id: `Q${pos + 1}`,
            question_text: qText,
            draft_answer: null,
            flag: true,
            flag_type: "No library match",
            flag_reason: "No answer was returned for this question.",
            library_entries_used: [],
          };
          rows.push({
            project_id: id,
            question_id: d.question_id || `Q${pos + 1}`,
            question: qText,
            draft_answer: d.draft_answer || null,
            edited_answer: d.draft_answer || null,
            status: statusFromDraft(d),
            flag: !!d.flag,
            flag_type: d.flag_type || null,
            flag_reason: d.flag_reason || null,
            library_entries_used: d.library_entries_used || [],
            position: pos,
          });
          pos++;
        });
      });
      const saved = await insertProjectEntries(rows);
      setEntries(saved);
      setRaw("");
      setPhase("idle");
      setDraftProgress(null);
    } catch (e) {
      setErr(e.message);
      setPhase("idle");
      setDraftProgress(null);
    }
  }

  function batchLibraryForQuestions(questions, scopedEntries) {
    const seen = new Set();
    const matched = [];
    for (const question of questions) {
      for (const entry of matchLibraryEntries(question, scopedEntries, MATCHES_PER_QUESTION)) {
        const key = `${entry.question}\n${entry.answer || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matched.push(entry);
      }
    }
    return libraryTextFromEntries(matched) || "### Matched Supabase Library\nNo matching Supabase library entries were found for this batch. Use supplemental sources only when they directly answer the question; otherwise flag the answer as No library match.";
  }

  async function readApiJson(res, fallbackLabel) {
    const body = await res.text().catch(() => "");
    if (res.status === 504 || res.status === 502) {
      throw new Error(`${fallbackLabel} timed out on Vercel. Try fewer questions or a narrower library category, then run it again.`);
    }
    let data = null;
    if (body) {
      try { data = JSON.parse(body); } catch {
        const details = body.slice(0, 180);
        throw new Error(res.ok ? `${fallbackLabel} returned an invalid response.` : `${fallbackLabel} failed (HTTP ${res.status}). ${details}`);
      }
    }
    if (!res.ok) {
      throw new Error(data?.error || `${fallbackLabel} failed (HTTP ${res.status})`);
    }
    return data || {};
  }

  // Draft one small batch of questions. Retries transient failures (rate limits /
  // overload / timeouts) with backoff so high concurrency never fails the whole
  // run; surfaces readable errors otherwise.
  async function draftBatch(questions, library, attempt = 0) {
    let res;
    try {
      res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, prospect: project?.prospect || "Unknown", library }),
      });
    } catch (e) {
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 800 * (attempt + 1))); return draftBatch(questions, library, attempt + 1); }
      throw new Error(`Network error contacting the drafting service: ${e.message}`);
    }
    if ([429, 502, 503, 504, 529].includes(res.status) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      return draftBatch(questions, library, attempt + 1);
    }
    const data = await readApiJson(res, "Draft batch");
    return data.answers || [];
  }

  function patch(idx, fields) {
    setEntries((es) => {
      const next = [...es];
      next[idx] = { ...next[idx], ...fields };
      if (next[idx].id) updateProjectEntry(next[idx].id, fields).catch(() => {});
      return next;
    });
  }
  function handleStatusChange(idx, status) { patch(idx, { status }); }
  function handleAnswerEdit(idx, text) { patch(idx, { edited_answer: text, status: "edited" }); }
  async function handlePromote(idx) {
    const q = entries[idx];
    try {
      await createEntry({ question: q.question, answer: q.edited_answer, status: "never_reviewed" });
    } catch (e) { setErr("Could not save to library: " + e.message); }
  }

  async function addTemplateEntry(question) {
    try {
      const saved = await insertProjectEntries([{
        project_id: id,
        question_id: `T${(entries || []).length + 1}`,
        question,
        draft_answer: null,
        edited_answer: null,
        status: "draft",
        position: (entries || []).length,
      }]);
      setEntries((prev) => [...(prev || []), ...saved]);
      setTemplateEntryOpen(false);
    } catch (e) { setErr(e.message); }
  }

  async function updateTemplateEntry(entry, question) {
    try {
      const updated = await updateProjectEntry(entry.id, { question });
      setEntries((prev) => (prev || []).map((e) => (e.id === entry.id ? updated : e)));
    } catch (e) { setErr(e.message); }
  }

  async function removeProjectEntry(idx) {
    const entry = entries[idx];
    if (!entry?.id || !confirm("Delete this project entry?")) return;
    try {
      await deleteProjectEntry(entry.id);
      setEntries((prev) => prev.filter((_, i) => i !== idx));
    } catch (e) { setErr(e.message); }
  }

  async function removeTemplateEntry(entry) {
    if (!entry?.id || !confirm("Delete this template entry?")) return;
    try {
      await deleteProjectEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (e) { setErr(e.message); }
  }

  function needsAttention(q) {
    return q.status !== "approved" && (!!q.flag || !q.draft_answer || ["needs_legal", "needs_engineering", "withheld"].includes(q.status));
  }

  async function approveCleanAnswers() {
    const targets = (entries || [])
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => !needsAttention(entry) && entry.status !== "approved" && entry.draft_answer);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map(({ entry }) => updateProjectEntry(entry.id, { status: "approved" })));
      setEntries((prev) => prev.map((entry) => targets.some((t) => t.entry.id === entry.id) ? { ...entry, status: "approved" } : entry));
      setExportMsg(`Approved ${targets.length} clean answer${targets.length === 1 ? "" : "s"}.`);
      setTimeout(() => setExportMsg(null), 3000);
    } catch (e) { setErr(e.message); }
  }

  function exportTxt() {
    const approved = (entries || []).filter((q) => q.status === "approved");
    const lines = approved.map((q, i) => `Q${i + 1}: ${q.question}\n\nA: ${resolveMV(q.edited_answer)}\n\n${q.flag ? "⚠ FLAGGED: " + (q.flag_reason || "") + "\n" : ""}---`);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project?.prospect || "project"}_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg(approved.length ? `Exported ${approved.length} approved answer(s)` : "No approved answers yet");
    setTimeout(() => setExportMsg(null), 3000);
  }

  // Export every answer (not just approved) for pasting into a doc to validate.
  function exportAll() {
    const all = entries || [];
    const lines = all.map((q, i) => {
      const ans = resolveMV(q.edited_answer || q.draft_answer || "(no answer)");
      const flag = q.flag ? `\n[⚠ ${q.flag_type || "Flag"}: ${q.flag_reason || "needs validation"}]` : "";
      return `${i + 1}. ${q.question}\n${ans}${flag}`;
    });
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project?.prospect || "project"}_all_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg(all.length ? `Exported all ${all.length} answer(s)` : "Nothing to export");
    setTimeout(() => setExportMsg(null), 3000);
  }

  // Generate a formatted review-draft report (header · sections · ☑/☐ checkboxes)
  // from the validated answers + the original questionnaire, then download it.
  async function generateReport(meta) {
    setReportBusy(true);
    setErr(null);
    // Open the tab synchronously (within the click) so popup blockers allow it.
    const win = window.open("", "_blank");
    if (win) win.document.write("<p style='font-family:Arial,sans-serif;color:#666;padding:28px'>Generating report…</p>");
    try {
      const meta2 = { ...meta, prospect: project?.prospect || "Vendor" };
      const answers = (entries || []).map((q, i) => ({
        number: i + 1,
        question: q.question,
        answer: resolveMV(q.edited_answer || q.draft_answer || ""),
        flag: !!q.flag,
        flag_type: q.flag_type || null,
      }));
      const questionnaire = project?.notes || answers.map((a) => `${a.number}. ${a.question}`).join("\n");
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 180000); // never hang forever
      let res;
      try {
        res = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionnaire, answers, meta: meta2 }),
          signal: ctrl.signal,
        });
      } catch (e) {
        throw new Error(e.name === "AbortError" ? "Report timed out — try again." : e.message);
      } finally {
        clearTimeout(timer);
      }
      const data = await readApiJson(res, "Report generation");

      // Styled, print-to-PDF document with the report's UI elements.
      const html = reportToHtml(data.report, meta2);
      if (win) { win.document.open(); win.document.write(html); win.document.close(); }
      else {
        // Popup blocked — fall back to downloading the HTML file.
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${project?.prospect || "project"}_review_draft_${new Date().toISOString().slice(0, 10)}.html`; a.click();
        URL.revokeObjectURL(url);
      }
      setReportOpen(false);
      setExportMsg("Review-draft report ready — use “Save as PDF” in the new tab.");
      setTimeout(() => setExportMsg(null), 4000);
    } catch (e) {
      if (win) win.close();
      setErr(e.message);
    } finally {
      setReportBusy(false);
    }
  }

  if (err && !project) return <div style={{ color: C.red, fontSize: 13 }}>{err}</div>;
  if (!project || entries == null) return <Spinner />;

  const hasEntries = entries.length > 0;
  const approved = entries.filter((q) => q.status === "approved").length;
  const flagged = entries.filter((q) => q.flag).length;
  const attentionItems = entries.map((q, i) => ({ q, i })).filter(({ q }) => needsAttention(q));
  const cleanItems = entries.map((q, i) => ({ q, i })).filter(({ q }) => !needsAttention(q));
  const cleanPendingApproval = cleanItems.filter(({ q }) => q.status !== "approved" && q.draft_answer).length;

  if (project.is_template) {
    return (
      <TemplateWorkspace
        project={project}
        entries={entries}
        err={err}
        exportMsg={exportMsg}
        onDownload={downloadTemplate}
        onPublish={publishTemplate}
        onAddEntry={() => setTemplateEntryOpen(true)}
        templateEntryOpen={templateEntryOpen}
        onCloseEntry={() => setTemplateEntryOpen(false)}
        onCreateEntry={addTemplateEntry}
        onUpdateEntry={updateTemplateEntry}
        onDeleteEntry={removeTemplateEntry}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${project.prospect || "—"} · ${entries.length} questions${project.is_template ? " · Template" : ""}`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {!project.is_template && <Button onClick={saveAsTemplate}>Save as Template</Button>}
            {hasEntries && <Button variant="primary" onClick={() => setReportOpen(true)}>Generate report</Button>}
            {hasEntries && <Button onClick={exportAll}>Export all (.txt)</Button>}
            {hasEntries && <Button onClick={exportTxt}>Export approved (.txt)</Button>}
          </div>
        }
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {exportMsg && <div style={{ background: C.greenSoft, color: "#15803D", fontSize: 13, padding: "9px 14px", borderRadius: 9, marginBottom: 14, border: "1px solid #BBE7CB" }}>{exportMsg}</div>}

      {phase === "drafting" ? (
        <div>
          <DraftProgress prospect={project.prospect} done={draftProgress?.done || 0} total={draftProgress?.total || matches.length} />
          <Stepper statuses={["complete", "complete", "active", "pending"]} />
          {matches.map((m, i) => (
            <div key={m.question + i} style={{ border: `1px solid ${C.cardLine}`, borderRadius: 16, padding: "18px 20px", marginBottom: 14, background: "#fff" }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Question — {project.prospect || "—"} · Q{i + 1}</div>
              <div style={{ fontSize: 15.5, color: C.ink, fontWeight: 550, lineHeight: 1.45, marginBottom: m.entries.length ? 14 : 0 }}>{m.question}</div>
              {m.entries.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Library matches</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {m.entries.map((e) => (
                      <span key={e.question} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>
                        <IconBook /> {e.question}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.faint, marginTop: 10 }}>{m.entries.length} relevant {m.entries.length === 1 ? "entry" : "entries"} found · drafting now…</div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : !hasEntries ? (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Button onClick={() => setImportOpen(true)}>Import Questions</Button>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`Paste questionnaire questions here — one per line, numbered or not.\n\nExample:\n1. Is your platform FedRAMP authorized?\n2. Do you support SSO via SAML 2.0?\n3. What is your data retention policy?`}
            style={{ width: "100%", height: 250, fontSize: 14, lineHeight: 1.6, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: C.ink }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="primary" disabled={!raw.trim()} onClick={handleDraft} style={{ opacity: raw.trim() ? 1 : 0.5, cursor: raw.trim() ? "pointer" : "not-allowed" }}>Draft answers</Button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.faint }}>
              <span>Draft against:</span>
              <Select
                value={draftScope.id}
                onChange={(e) => {
                  const v = e.target.value;
                  const cat = categories.find((c) => c.id === v);
                  setDraftScope(v === "all" ? { id: "all", name: "Full library" } : { id: v, name: cat?.name || "Library" });
                }}
                style={{ width: "auto", padding: "5px 9px", fontSize: 12.5 }}
              >
                <option value="all">Full library</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <span style={{ fontSize: 12.5, color: C.faint }}>{raw.trim() ? `~${parseQuestions(raw).length} questions detected` : ""}</span>
          </div>
        </div>
      ) : (
        <div>
          <Stepper statuses={["complete", "complete", "complete", "active"]} />
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <Stat label="Total" value={entries.length} />
            <Stat label="Needs attention" value={attentionItems.length} tone={attentionItems.length ? "tan" : "green"} />
            <Stat label="Approved" value={approved} tone="green" />
            <Stat label="Flagged" value={flagged} tone="tan" />
            {cleanPendingApproval > 0 && <Button variant="primary" onClick={approveCleanAnswers}>Approve {cleanPendingApproval} clean</Button>}
          </div>

          {attentionItems.length > 0 ? (
            <ReviewGroup title="Needs attention" hint="Claude flagged these for legal, engineering, no-match, or missing-answer review.">
              {attentionItems.map(({ q, i }) => (
                <QuestionCard key={q.id || i} q={q} idx={i} prospect={project.prospect} category={categoryForEntry(q)} libraryLabel={libraryLabel} resolve={resolveMV} onStatusChange={handleStatusChange} onAnswerEdit={handleAnswerEdit} onPromote={handlePromote} onDelete={removeProjectEntry} attention />
              ))}
            </ReviewGroup>
          ) : (
            <div style={{ background: C.greenSoft, border: "1px solid #BBE7CB", color: "#15803D", borderRadius: 12, padding: "12px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              No answers need attention. Clean answers were approved automatically.
            </div>
          )}

          <ReviewGroup title="Approved / resolved answers" hint="Clean answers are approved automatically. Manually approved attention items move here after review.">
            {cleanItems.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, padding: "10px 0" }}>No clean answers yet.</div>
            ) : cleanItems.map(({ q, i }) => (
              <QuestionCard key={q.id || i} q={q} idx={i} prospect={project.prospect} category={categoryForEntry(q)} libraryLabel={libraryLabel} resolve={resolveMV} onStatusChange={handleStatusChange} onAnswerEdit={handleAnswerEdit} onPromote={handlePromote} onDelete={removeProjectEntry} compact />
            ))}
          </ReviewGroup>
        </div>
      )}

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(qs) => {
            setRaw((prev) => (prev.trim() ? prev.trim() + "\n" : "") + qs.join("\n"));
            setImportOpen(false);
          }}
        />
      )}

      {reportOpen && (
        <ReportModal busy={reportBusy} onClose={() => setReportOpen(false)} onGenerate={generateReport} />
      )}
    </div>
  );
}

function ReportModal({ busy, onClose, onGenerate }) {
  const [vendor, setVendor] = useState("People.ai, Inc.");
  const [preparedBy, setPreparedBy] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <Modal title="Generate review-draft report" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>
        Formats every answer into an internal review document — section groupings, ☑/☐ checkbox rendering, and a header — ready to paste into a doc.
      </div>
      <Field label="Vendor (your organization)">
        <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="People.ai, Inc. d/b/a Backstory" />
      </Field>
      <Field label="Prepared by">
        <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Your name" />
      </Field>
      <Field label="Date">
        <Input value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={() => onGenerate({ vendor, preparedBy, date })}>{busy ? "Generating…" : "Generate report"}</Button>
      </div>
    </Modal>
  );
}

function ReviewGroup({ title, hint, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</h2>
        {hint && <span style={{ fontSize: 12.5, color: C.muted }}>{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function DraftProgress({ prospect, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ position: "sticky", top: 8, zIndex: 6, marginBottom: 20, background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 16, padding: "18px 20px", boxShadow: "0 6px 20px rgba(16,24,40,0.10)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", gap: 4 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, animation: `dpulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Drafting answers{prospect ? ` for ${prospect}` : ""}…</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {done} of {total} questions grounded &amp; drafted{total && done < total ? " · long questionnaires run in batches" : ""}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.blueInk, fontVariantNumeric: "tabular-nums" }}>{pct}%</div>
      </div>
      <div style={{ position: "relative", height: 10, background: C.panel, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ position: "absolute", insetBlock: 0, left: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.blueInk})`, borderRadius: 999, transition: "width .5s cubic-bezier(.4,0,.2,1)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)", animation: "dshimmer 1.4s linear infinite" }} />
      </div>
      <style>{`@keyframes dpulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}@keyframes dshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const styles = {
    default: { background: C.panel, border: `1px solid ${C.line}`, color: C.muted },
    green: { background: C.greenSoft, border: "1px solid #BBE7CB", color: "#15803D" },
    tan: { background: C.tan, border: `1px solid ${C.tanLine}`, color: C.tanInk },
  };
  const s = styles[tone] || styles.default;
  return (
    <div style={{ background: s.background, border: s.border, borderRadius: 10, padding: "9px 15px", fontSize: 13 }}>
      <span style={{ color: s.color }}>{label} </span>
      <strong style={{ color: tone ? s.color : C.ink }}>{value}</strong>
    </div>
  );
}

function TemplateWorkspace({ project, entries, err, exportMsg, onDownload, onPublish, onAddEntry, templateEntryOpen, onCloseEntry, onCreateEntry, onUpdateEntry, onDeleteEntry }) {
  const [editingEntry, setEditingEntry] = useState(null);
  const published = project.status === "approved";
  return (
    <div style={{ margin: "-18px -16px -80px", minHeight: "calc(100vh - 52px)", background: C.bg }}>
      <div style={{ height: 58, background: "#fff", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.ink }}>{project.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button onClick={onDownload}>Download Template</Button>
          <Button variant="primary" onClick={onPublish}>{published ? "Published Project Template" : "Publish Project Template"}</Button>
          <button style={{ border: "none", background: "transparent", color: C.blueInk, fontSize: 20, cursor: "pointer" }}>...</button>
        </div>
      </div>

      {!published && (
        <div style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.blueInk,
          fontSize: 13,
          fontWeight: 650,
          backgroundImage: "repeating-linear-gradient(135deg, #F9E5B2 0, #F9E5B2 4px, #FFF8E8 4px, #FFF8E8 10px)",
          borderBottom: `1px solid ${C.tanLine}`,
        }}>
          This Project Template is currently in draft mode.
        </div>
      )}

      {err && <div style={{ color: C.red, fontSize: 13, margin: 16 }}>{err}</div>}
      {exportMsg && <div style={{ background: C.greenSoft, color: "#15803D", fontSize: 13, padding: "9px 14px", borderRadius: 9, margin: 16, border: "1px solid #BBE7CB" }}>{exportMsg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", minHeight: published ? "calc(100vh - 110px)" : "calc(100vh - 144px)" }}>
        <aside style={{ background: "#fff", borderRight: `1px solid ${C.line}`, padding: "14px 14px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", color: C.blueInk, fontSize: 15, marginBottom: 24 }}>
            <span style={toolIcon}>☷</span><span style={toolIcon}>□</span><span style={toolIcon}>i</span>
            <span style={{ marginLeft: "auto", color: C.muted }}>←</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Project Outline</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.body }}>
            <span>⌄</span>
            <div style={{ flex: 1, background: "#ECEBF4", borderRadius: 4, padding: "8px 10px", fontWeight: 700 }}>[Untitled Section]</div>
          </div>
        </aside>

        <main style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 54 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button style={filterBtn}>▽</button>
              <Input placeholder="Search Questions & Answers" style={{ width: 300, borderRadius: 4 }} />
            </div>
            <button style={linkBtn}>Hide / Show All Answers</button>
          </div>

          <div style={{ maxWidth: 760 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.body, marginBottom: 28 }}>
              <span style={{ color: C.muted }}>⌄</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>[Untitled Section]</h2>
              <span style={{ marginLeft: "auto", color: C.muted }}>...</span>
            </div>
            <TemplateAction onClick={() => {}}>+ Add Instructions to <strong>[Untitled Section]</strong></TemplateAction>
            <TemplateAction onClick={onAddEntry}>+ Add Entry to <strong>[Untitled Section]</strong></TemplateAction>
            <TemplateAction onClick={() => {}}>+ Add Subsection to <strong>[Untitled Section]</strong></TemplateAction>
            <button onClick={() => {}} style={{ ...linkBtn, marginTop: 16 }}>+ Add Section</button>

            {entries.length > 0 && (
              <div style={{ marginTop: 28, borderTop: `1px solid ${C.line}`, paddingTop: 18 }}>
                {entries.map((entry, i) => (
                  <div key={entry.id || i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Entry {i + 1}</div>
                      <div style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{entry.question}</div>
                    </div>
                    <button onClick={() => setEditingEntry(entry)} style={smallBtn}>Edit</button>
                    <button onClick={() => onDeleteEntry(entry)} style={{ ...smallBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {templateEntryOpen && <TemplateEntryModal onClose={onCloseEntry} onCreate={onCreateEntry} />}
      {editingEntry && (
        <TemplateEntryModal
          initial={editingEntry}
          onClose={() => setEditingEntry(null)}
          onCreate={(question) => { onUpdateEntry(editingEntry, question); setEditingEntry(null); }}
        />
      )}
    </div>
  );
}

function TemplateAction({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: "block", border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: "10px 0 10px 28px" }}>
      {children}
    </button>
  );
}

function TemplateEntryModal({ initial, onClose, onCreate }) {
  const [question, setQuestion] = useState(initial?.question || "");
  return (
    <Modal title={initial ? "Edit Template Entry" : "Add Template Entry"} onClose={onClose}>
      <Field label="Question / prompt">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} autoFocus placeholder="e.g. Do you support SSO via SAML 2.0?" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!question.trim()} onClick={() => onCreate(question.trim())}>{initial ? "Save" : "Add Entry"}</Button>
      </div>
    </Modal>
  );
}

const toolIcon = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 };
const filterBtn = { width: 30, height: 30, border: `1px solid ${C.line}`, background: "#fff", color: C.blueInk, borderRadius: 3, cursor: "pointer" };
const linkBtn = { border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 13, fontWeight: 650, fontFamily: "inherit" };
const smallBtn = { fontSize: 12, padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", background: "#fff", color: C.body, fontFamily: "inherit" };
