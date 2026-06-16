import { C } from "../lib/theme.js";

export function Button({ variant = "default", style, ...props }) {
  const variants = {
    default: { background: "#fff", color: C.body, border: `1px solid ${C.line}` },
    primary: { background: C.blue, color: "#fff", border: `1px solid ${C.blue}`, fontWeight: 600 },
    subtle: { background: C.panel, color: C.body, border: `1px solid ${C.line}` },
    ghost: { background: "transparent", color: C.blue, border: "1px solid transparent" },
    danger: { background: "#fff", color: C.red, border: `1px solid ${C.redSoft}` },
  };
  return (
    <button
      style={{ fontSize: 13, padding: "8px 16px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", ...(variants[variant] || variants.default), ...style }}
      {...props}
    />
  );
}

export function Pill({ tone = "muted", icon, children }) {
  const tones = {
    muted: { background: "#F4F4F2", color: C.muted, border: "1px solid #ECECE8" },
    tan: { background: C.tan, color: C.tanInk, border: `1px solid ${C.tanLine}` },
    info: { background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB" },
    blue: { background: C.blueSoft, color: C.blueInk, border: `1px solid ${C.blueSoft}` },
    green: { background: C.greenSoft, color: "#15803D", border: "1px solid #BBE7CB" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 500, ...(tones[tone] || tones.muted) }}>
      {icon} {children}
    </span>
  );
}

export function StatusDot({ color }) {
  return <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}

export function Card({ style, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 16, boxShadow: "0 1px 2px rgba(16,24,40,0.03)", ...style }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, borderBottom: `1px solid ${C.line}`, paddingBottom: 14, marginBottom: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 650, color: C.ink }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function Empty({ title, hint }) {
  return (
    <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: C.muted }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.body, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 13 }}>{hint}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, alignItems: "center", padding: "2.5rem 0", color: C.muted, fontSize: 13 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      <span style={{ marginLeft: 6 }}>{label}</span>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

export function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,22,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: "100%", background: "#fff", borderRadius: 14, boxShadow: "0 20px 50px rgba(16,24,40,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: C.ink }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, color: C.muted, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Input({ style, ...props }) {
  return (
    <input
      style={{ width: "100%", fontSize: 13, padding: "8px 11px", borderRadius: 9, border: `1px solid ${C.line}`, boxSizing: "border-box", fontFamily: "inherit", color: C.ink, ...style }}
      {...props}
    />
  );
}

export function Select({ style, children, ...props }) {
  return (
    <select
      style={{ width: "100%", fontSize: 13, padding: "8px 11px", borderRadius: 9, border: `1px solid ${C.line}`, boxSizing: "border-box", background: "#fff", color: C.ink, fontFamily: "inherit", cursor: "pointer", ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}
