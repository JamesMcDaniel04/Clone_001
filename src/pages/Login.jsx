import { Navigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, ALLOWED_DOMAIN } from "../lib/supabaseClient.js";
import { useSession } from "../auth/SessionProvider.jsx";
import { C, font } from "../lib/theme.js";

export default function Login() {
  const { user } = useSession();
  if (user) return <Navigate to="/" replace />;

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#fff", borderRadius: 16, padding: "34px 32px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>clone</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 650, color: C.ink, marginBottom: 6 }}>Security questionnaire platform</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
          Sign in with your{ALLOWED_DOMAIN ? ` @${ALLOWED_DOMAIN}` : " work"} Google account to access projects, reviews, and the answer library.
        </div>

        {isSupabaseConfigured ? (
          <button onClick={signIn} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
            Continue with Google
          </button>
        ) : (
          <div style={{ fontSize: 13, color: C.body, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.55 }}>
            Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> and follow <code>docs/SETUP.md</code>.
          </div>
        )}
      </div>
    </div>
  );
}
