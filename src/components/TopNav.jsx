import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { C } from "../lib/theme.js";
import { useSession, userDisplay } from "../auth/SessionProvider.jsx";
import { IconHome, IconSearch, IconChevron } from "./icons.jsx";

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return { open, setOpen, ref };
}

function NavMenu({ label, to, items }) {
  const { open, setOpen, ref } = useDropdown();
  const loc = useLocation();
  const active = to ? loc.pathname === to || loc.pathname.startsWith(to + "/") : false;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => (items ? setOpen((o) => !o) : null)}
        style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: active ? "#fff" : C.navyText, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer", padding: "6px 2px", fontFamily: "inherit" }}
      >
        {to && !items ? <Link to={to} style={{ color: "inherit", textDecoration: "none" }}>{label}</Link> : label}
        {items && <IconChevron size={13} />}
      </button>
      {items && open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, background: "#fff", borderRadius: 10, boxShadow: "0 12px 30px rgba(16,24,40,0.18)", border: `1px solid ${C.line}`, minWidth: 200, padding: 6, zIndex: 40 }}>
          {items.map((it) => (
            <Link key={it.to} to={it.to} onClick={() => setOpen(false)} style={{ display: "block", padding: "8px 12px", borderRadius: 7, fontSize: 13, color: C.body, textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const { user } = useSession();
  const { open, setOpen, ref } = useDropdown();
  const u = userDisplay(user);

  return (
    <div style={{ background: C.navy, borderBottom: `1px solid ${C.navyLine}` }}>
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 22, padding: "0 20px", maxWidth: 1340, margin: "0 auto" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2.4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: 0.2 }}>clone</span>
        </Link>

        <Link to="/" style={{ color: C.navyText, display: "flex", alignItems: "center" }} title="Home"><IconHome /></Link>
        <NavMenu label="Projects" to="/projects" items={[
          { label: "Project List", to: "/projects" },
          { label: "Templates", to: "/projects/templates" },
        ]} />
        <NavMenu label="Reviews" to="/reviews" items={[
          { label: "From Projects", to: "/reviews/projects" },
          { label: "From Library", to: "/reviews/library" },
        ]} />
        <NavMenu label="Library" to="/library" items={[
          { label: "Search", to: "/library/search" },
          { label: "Library Management", to: "/library" },
          { label: "Merge Variables", to: "/library/merge-variables" },
          { label: "Tags", to: "/library/tags" },
        ]} />

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          <Link to="/library/search" style={{ color: C.navyText, display: "flex" }} title="Search"><IconSearch /></Link>
          <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: C.navyHi, border: `1px solid ${C.navyLine}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{u.initials}</span>
              <span style={{ fontSize: 13, color: C.navyText }}>{u.name?.split(" ")[0]}</span>
              <IconChevron size={13} color={C.navyText} />
            </button>
            {open && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff", borderRadius: 10, boxShadow: "0 12px 30px rgba(16,24,40,0.18)", border: `1px solid ${C.line}`, minWidth: 210, padding: 6, zIndex: 40 }}>
                <div style={{ padding: "8px 12px", fontSize: 12, color: C.muted, borderBottom: `1px solid ${C.line}`, marginBottom: 4 }}>{u.email || u.name}</div>
                <Link to="/settings" onClick={() => setOpen(false)} style={{ display: "block", padding: "8px 12px", borderRadius: 7, fontSize: 13, color: C.body, textDecoration: "none" }}>Settings</Link>
                <Link to="/setup" onClick={() => setOpen(false)} style={{ display: "block", padding: "8px 12px", borderRadius: 7, fontSize: 13, color: C.body, textDecoration: "none" }}>Setup wizard</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
