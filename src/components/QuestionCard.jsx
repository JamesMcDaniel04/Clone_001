import { useState } from "react";
import { C } from "../lib/theme.js";
import { IconShield, IconBook, IconCheck, IconChevron } from "./icons.jsx";

// Renders one project entry as a collapsible card: a clickable header (question +
// status) expands the answer; clicking the answer (or the Details toggle) reveals
// the sources Claude used and its reasoning for the approved / needs-review / gap
// classification. q = project_entries row; callbacks persist to Supabase.
export default function QuestionCard({ q, idx, prospect, category, libraryLabel, resolve, onStatusChange, onAnswerEdit, onPromote, onDelete, attention = false, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(q.edited_answer || q.draft_answer || "");
  const [promoted, setPromoted] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [showDetails, setShowDetails] = useState(false);

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
  const classLabel = statusLabels[q.status] || "Drafted";
  const sourceCount = q.library_entries_used?.length || 0;

  const statusBadge = (
    <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 7, flexShrink: 0, background: statusColors[q.status] || C.greenSoft, color: q.status === "approved" ? "#15803D" : C.body }}>{classLabel}</span>
  );

  return (
    <div style={{ border: `1px solid ${attention ? C.tanLine : C.cardLine}`, borderLeft: attention ? `4px solid ${C.amber}` : `1px solid ${C.cardLine}`, borderRadius: 16, padding: expanded ? "18px 22px" : "12px 16px", marginBottom: expanded ? 16 : 10, background: "#fff", boxShadow: "0 1px 2px rgba(16,24,40,0.03)" }}>
      {/* Header — click to expand / collapse the answer */}
      <div onClick={() => setExpanded((e) => !e)} style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Question — {prospect || "—"} · {q.question_id || `Q${idx + 1}`}</div>
          <div style={{ fontSize: expanded ? 16.5 : 14, color: C.ink, fontWeight: expanded ? 550 : 600, lineHeight: 1.45, ...(expanded ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }) }}>{q.question}</div>
        </div>
        {statusBadge}
        <span style={{ display: "inline-flex", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s", color: C.faint }}><IconChevron /></span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {q.flag && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tan, color: C.tanInk, border: `1px solid ${C.tanLine}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                <IconShield /> {q.flag_type || "Flagged for review"}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", background: "#F4F4F2", color: C.muted, border: "1px solid #ECECE8", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>
              {category || "Vendor security"}{q.section?.name ? ` · ${q.section.name}` : ""}
            </span>
          </div>

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
            <div onClick={() => setShowDetails((s) => !s)} title="Click for sources & reasoning" style={{ border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px", background: C.panel, fontSize: 14, lineHeight: 1.7, color: C.body, whiteSpace: "pre-wrap", cursor: "pointer" }}>
              {shownAnswer}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", border: "1px solid #F1D9D6", borderRadius: 12, padding: "14px 16px", background: "#FDF4F3", fontSize: 13.5, color: "#B4453B" }}>
              <span style={{ fontStyle: "italic" }}>Gap — no answer in the library yet.</span>
              <button onClick={() => setEditing(true)} style={{ ...btn, background: "#fff", borderColor: "#F1D9D6", color: "#B4453B", fontWeight: 600, fontStyle: "normal" }}>Answer this gap</button>
            </div>
          )}

          {!editing && (
            <button onClick={() => setShowDetails((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, border: "none", background: "transparent", color: C.blueInk, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              <span style={{ display: "inline-flex", transform: showDetails ? "rotate(180deg)" : "none", transition: "transform .15s" }}><IconChevron size={12} color={C.blueInk} /></span>
              {showDetails ? "Hide details" : `Why ${classLabel.toLowerCase()}?${sourceCount ? ` · ${sourceCount} source${sourceCount === 1 ? "" : "s"}` : ""}`}
            </button>
          )}

          {showDetails && !editing && (
            <div style={{ marginTop: 10, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", background: "#FCFCFB" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>Why Claude marked this {classLabel}</div>
              <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6 }}>{q.flag_reason || "No reasoning was recorded for this answer."}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3, margin: "14px 0 8px" }}>Sources</div>
              {sourceCount > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {q.library_entries_used.map((e) => (
                    <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>
                      <IconBook /> {e}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.faint, fontStyle: "italic" }}>
                  {q.status === "gap" ? "No library sources — this question isn't covered by the library yet." : "No specific library entries cited for this answer."}
                </div>
              )}
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
      )}
    </div>
  );
}
