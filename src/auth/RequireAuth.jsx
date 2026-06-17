import { Navigate } from "react-router-dom";
import { useSession } from "./SessionProvider.jsx";
import { isSupabaseConfigured, ALLOWED_DOMAIN, supabase } from "../lib/supabaseClient.js";
import { C, font } from "../lib/theme.js";

function Centered({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: font, padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 16, padding: "28px 30px", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>{children}</div>
    </div>
  );
}

export default function RequireAuth({ children }) {
  const { user, loading, anonError } = useSession();

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <div style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Connect Supabase to continue</div>
        <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6 }}>
          This is the Clone platform. It needs a Supabase project for its database and sign-in. Add{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>VITE_SUPABASE_URL</code> and{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>VITE_SUPABASE_ANON_KEY</code> to{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>.env.local</code>, run the SQL in{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>supabase/</code>, then restart. Full steps are in{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>docs/SETUP.md</code>.
        </div>
      </Centered>
    );
  }

  // Test mode (VITE_DISABLE_AUTH=true): an anonymous session is created automatically so
  // the database works without a real login — no SQL needed, just enable Anonymous sign-ins.
  if (import.meta.env.VITE_DISABLE_AUTH === "true") {
    if (anonError) {
      return (
        <Centered>
          <div style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Enable anonymous sign-ins</div>
          <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6 }}>
            Test mode signs in anonymously so the database works without a login, but your Supabase
            project has that turned off. Enable it in{" "}
            <strong>Supabase → Authentication → Sign In / Providers → Anonymous Sign-Ins</strong>{" "}
            (toggle on, Save), then refresh this page.
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>Supabase said: {anonError}</div>
          </div>
        </Centered>
      );
    }
    if (loading || !user) {
      return <Centered><div style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>Starting test session…</div></Centered>;
    }
    return children;
  }

  if (loading) {
    return <Centered><div style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>Loading…</div></Centered>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (ALLOWED_DOMAIN && !(user.email || "").toLowerCase().endsWith("@" + ALLOWED_DOMAIN.toLowerCase())) {
    return (
      <Centered>
        <div style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Access restricted</div>
        <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6, marginBottom: 18 }}>
          {user.email} isn't on the <strong>@{ALLOWED_DOMAIN}</strong> domain. Ask an admin for access or sign in with a work account.
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 9, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", color: C.body }}>
          Sign out
        </button>
      </Centered>
    );
  }

  return children;
}
