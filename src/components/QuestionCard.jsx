import { useState } from "react";
import { C } from "../lib/theme.js";
import { IconShield, IconBook, IconCheck } from "./icons.jsx";

// Renders one project entry: question, gap/library pills, Claude draft, flag
// callout, and the review controls (status + edit + promote). Ports the Phase-0
// review card. q = project_entries row; callbacks persist to Supabase.
export default function QuestionCard({ q, idx, prospect, category, libraryLabel, resolve, onStatusChange, onAnswerEdit, onPromote, onDelete, attention = false, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(q.edited_answer || q.draft_answer || "");
  const [promoted, setPromoted] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  // Tokens like [[Client Name]] are stored raw (reusable) and resolved on display.
  const rawAnswer = q.edited_answer || q.draft_answer || "";
  const shownAnswer = resolve ? resolve(rawAnswer) : rawAnswer;
  const mvApplied = shownAnswer !== rawAnswer;
  const hasAnswer = !!(q.edited_answer || q.draft_answer);

  // Claude classifies answers into the three review buckets (approved /
  // needs_review / gap); draft & edited are manual states. Legacy needs_legal /
  // needs_engineering / withheld still render for any pre-migration rows.
  const statusColors = {
    draft: "#F3F4F2", edited: "#EAF1FB", approved: C.greenSoft,
    needs_review: C.tan, gap: "#FCE8E6",
    needs_legal: C.tan, needs_engineering: "#EDE9FE", withheld: "#FCE8E6",
  };
  const statusLabels = {
    draft: "Draft", edited: "Edited", approved: "Approved",
    needs_review: "Needs review", gap: "Gap",
    needs_legal: "Needs legal", needs_engineering: "Needs engineering", withheld: "Withheld",
  };
  const STATUS_OPTIONS = ["draft", "edited", "approved", "needs_review", "gap"];
  const btn = { fontSize: 12, padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", background: "#fff", color: C.body, fontFamily: "inherit" };

  if (compact && !expanded) {
    return (
      <div style={{ border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10, background: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>{q.question_id || `Q${idx + 1}`} · {category || "Vendor security"}</div>
          <div style={{ fontSize: 14, color: C.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 7, background: statusColors[q.status] || C.greenSoft, color: q.status === "approved" ? "#15803D" : C.body }}>{statusLabels[q.status] || "Clean"}</span>
        <button onClick={() => setExpanded(true)} style={btn}>Review</button>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${attention ? C.tanLine : C.cardLine}`, borderLeft: attention ? `4px solid ${C.amber}` : `1px solid ${C.cardLine}`, borderRadius: 16, padding: "20px 22px", marginBottom: 16, background: "#fff", boxShadow: "0 1px 2px rgba(16,24,40,0.03)" }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Question — {prospect} · {q.question_id || `Q${idx + 1}`}</div>
      <div style={{ fontSize: 16.5, color: C.ink, fontWeight: 550, lineHeight: 1.5, marginBottom: 12 }}>{q.question}</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {q.flag && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tan, color: C.tanInk, border: `1px solid ${C.tanLine}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
            <IconShield /> {q.flag_type || "Flagged for review"}
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", background: "#F4F4F2", color: C.muted, border: "1px solid #ECECE8", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>
          {category || "Vendor security"}{q.section?.name ? ` · ${q.section.name}` : ""}
        </span>
      </div>

      {q.library_entries_used?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Library matches</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {q.library_entries_used.map((e) => (
              <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>
                <IconBook /> {e}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Claude draft</span>
          {mvApplied && !editing && (
            <span style={{ fontSize: 11, color: C.blueInk, background: C.blueSoft, borderRadius: 6, padding: "1px 7px", fontWeight: 600 }}>merge variables applied</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.faint }}>Draft against: {libraryLabel}</div>
      </div>

      {editing ? (
        <div>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type an answer to close this gap…" style={{ width: "100%", minHeight: 140, fontSize: 14, lineHeight: 1.7, border: `1px solid ${C.blueSoft}`, borderRadius: 10, padding: "12px 14px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: C.body }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => { onAnswerEdit(idx, answer); setEditing(false); }} style={{ ...btn, background: C.blue, color: "#fff", border: `1px solid ${C.blue}` }}>Save edit</button>
            <button onClick={() => { setAnswer(q.edited_answer || q.draft_answer || ""); setEditing(false); }} style={btn}>Cancel</button>
          </div>
        </div>
      ) : hasAnswer ? (
        <div style={{ border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px", background: C.panel, fontSize: 14, lineHeight: 1.7, color: C.body, whiteSpace: "pre-wrap" }}>
          {shownAnswer}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", border: "1px solid #F1D9D6", borderRadius: 12, padding: "14px 16px", background: "#FDF4F3", fontSize: 13.5, color: "#B4453B" }}>
          <span style={{ fontStyle: "italic" }}>Gap — no answer in the library yet.</span>
          <button onClick={() => setEditing(true)} style={{ ...btn, background: "#fff", borderColor: "#F1D9D6", color: "#B4453B", fontWeight: 600, fontStyle: "normal" }}>Answer this gap</button>
        </div>
      )}

      {q.flag && q.flag_reason && (
        <div style={{ marginTop: 12, background: C.cream, border: "1px solid #EFE2C2", borderLeft: `3px solid ${C.amber}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#6B4E1E", lineHeight: 1.55 }}>
          <span style={{ marginRight: 4 }}>⚠</span><strong>Flagged for review:</strong> {q.flag_reason}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 12, color: C.muted }}>Status</span>
        <select value={q.status || "draft"} onChange={(e) => onStatusChange(idx, e.target.value)} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: statusColors[q.status] || "#F3F4F2", cursor: "pointer", color: C.ink, fontWeight: 500, fontFamily: "inherit" }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {compact && <button onClick={() => setExpanded(false)} style={btn}>Collapse</button>}
          {!editing && hasAnswer && <button onClick={() => setEditing(true)} style={btn}>Edit</button>}
          {q.status !== "approved" && hasAnswer && <button onClick={() => onStatusChange(idx, "approved")} style={{ ...btn, background: C.greenSoft, border: "1px solid #BBE7CB", color: "#15803D", fontWeight: 600 }}>Approve</button>}
          {onDelete && <button onClick={() => onDelete(idx)} style={{ ...btn, color: C.red, borderColor: C.redSoft }}>Delete</button>}
          {!promoted && q.status === "approved" && (
            <button onClick={() => { onPromote(idx); setPromoted(true); }} style={{ ...btn, background: C.greenSoft, border: "1px solid #BBE7CB", color: "#15803D" }}>Save to library</button>
          )}
          {promoted && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803D", fontWeight: 600 }}><IconCheck color="#15803D" /> Saved to library</span>}
        </div>
      </div>
    </div>
  );
}
