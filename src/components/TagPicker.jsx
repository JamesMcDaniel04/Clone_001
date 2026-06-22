import { useMemo, useRef, useState } from "react";
import { C } from "../lib/theme.js";

// Reusable chip-style tag editor. Shows the selected tags as removable chips, with
// a typeahead that suggests existing tags and lets you create a new one on the fly.
//   value:    string[] of selected tag names
//   onChange: (next string[]) => void
//   allTags:  [{ id, name }] of every existing tag (for suggestions)
//   onCreate: optional async (name) => void — persist a brand-new tag; if omitted,
//             new names are still added to the selection (caller persists on save)
export default function TagPicker({ value = [], onChange, allTags = [], onCreate, placeholder = "Add a tag…" }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selectedLower = useMemo(() => new Set(value.map((t) => t.toLowerCase())), [value]);
  const query = input.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      allTags
        .filter((t) => !selectedLower.has(t.name.toLowerCase()) && (!query || t.name.toLowerCase().includes(query)))
        .slice(0, 8),
    [allTags, selectedLower, query]
  );
  const exactExists = allTags.some((t) => t.name.toLowerCase() === query) || selectedLower.has(query);

  function add(name) {
    const clean = name.trim();
    if (!clean || selectedLower.has(clean.toLowerCase())) { setInput(""); return; }
    onChange([...value, clean]);
    setInput("");
  }
  async function createAndAdd(name) {
    const clean = name.trim();
    if (!clean) return;
    if (onCreate && !allTags.some((t) => t.name.toLowerCase() === clean.toLowerCase())) {
      try { await onCreate(clean); } catch { /* surfaced by caller; still select it */ }
    }
    add(clean);
  }
  function remove(name) {
    onChange(value.filter((t) => t !== name));
  }
  function onKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); if (query) createAndAdd(input); }
    else if (e.key === "Backspace" && !input && value.length) remove(value[value.length - 1]);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => wrapRef.current?.querySelector("input")?.focus()}
        style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", minHeight: 38, padding: "6px 8px", borderRadius: 9, border: `1px solid ${C.line}`, background: "#fff", cursor: "text" }}
      >
        {value.map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.blueSoft, color: C.blueInk, border: `1px solid ${C.blueSoft}`, borderRadius: 7, padding: "3px 6px 3px 9px", fontSize: 12, fontWeight: 600 }}>
            {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(t); }} title="Remove" style={{ border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? "" : placeholder}
          style={{ flex: 1, minWidth: 90, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", color: C.ink, background: "transparent", padding: "2px 0" }}
        />
      </div>

      {open && (query || suggestions.length > 0) && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 9, boxShadow: "0 8px 24px rgba(16,24,40,0.12)", overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
          {suggestions.map((t) => (
            <button key={t.id ?? t.name} type="button" onMouseDown={(e) => { e.preventDefault(); add(t.name); }} style={menuItem}>{t.name}</button>
          ))}
          {query && !exactExists && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); createAndAdd(input); }} style={{ ...menuItem, color: C.blueInk, fontWeight: 600 }}>
              + Create “{input.trim()}”
            </button>
          )}
          {query && exactExists && suggestions.length === 0 && (
            <div style={{ ...menuItem, color: C.faint, cursor: "default" }}>Already added</div>
          )}
        </div>
      )}
    </div>
  );
}

const menuItem = { display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", fontSize: 13, color: C.body, cursor: "pointer", fontFamily: "inherit" };
