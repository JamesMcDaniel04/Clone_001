import { useState } from "react";
import { Navigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { useSession } from "../auth/SessionProvider.jsx";
import { C, font } from "../lib/theme.js";
import { Button, Input } from "../components/ui.jsx";

const ALLOWED_DOMAINS = ["backstory.ai", "people.ai"];
const domainOf = (email) => email.trim().toLowerCase().split("@")[1] || "";
const isAllowed = (email) => ALLOWED_DOMAINS.includes(domainOf(email));

export default function Login() {
  const { user } = useSession();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [step, setStep] = useState("creds"); // creds | verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [notice, setNotice] = useState(null);

  if (user) return <Navigate to="/" replace />;

  async function submitCreds(e) {
    e.preventDefault();
    setErr(null); setNotice(null);
    if (!isAllowed(email)) { setErr("Use your backstory.ai or people.ai email address to sign in."); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) return; // email confirmation disabled → signed in (onAuthStateChange redirects)
        setStep("verify");
        setNotice(`We sent a 6-digit confirmation code to ${email.trim()}. Enter it below to verify it's you.`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            await supabase.auth.resend({ type: "signup", email: email.trim() });
            setStep("verify");
            setNotice("Your email isn't confirmed yet — we sent a new code. Enter it below.");
            return;
          }
          throw error;
        }
        // success → session set, redirect handled by the `user` guard
      }
    } catch (e2) {
      setErr(friendly(e2.message));
    } finally { setBusy(false); }
  }

  async function submitCode(e) {
    e.preventDefault();
    setErr(null); setNotice(null);
    if (!/^\d{6}$/.test(code.trim())) { setErr("Enter the 6-digit code from your email."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" });
      if (error) throw error;
      // success → session set, redirect handled by the `user` guard
    } catch (e2) {
      setErr(friendly(e2.message));
    } finally { setBusy(false); }
  }

  async function resend() {
    setErr(null); setNotice(null); setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw error;
      setNotice("Code resent — check your inbox.");
    } catch (e2) { setErr(friendly(e2.message)); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#fff", borderRadius: 16, padding: "34px 32px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>MAX</div>
        </div>

        {!isSupabaseConfigured ? (
          <div style={{ fontSize: 13, color: C.body, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.55 }}>
            Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (or <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>) to <code>.env.local</code> and follow <code>docs/SETUP.md</code>.
          </div>
        ) : step === "verify" ? (
          <form onSubmit={submitCode}>
            <div style={{ fontSize: 20, fontWeight: 650, color: C.ink, marginBottom: 6 }}>Confirm your email</div>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>Enter the 6-digit code we emailed to <strong>{email.trim()}</strong>.</div>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoFocus style={{ fontSize: 18, letterSpacing: 4, textAlign: "center", marginBottom: 12 }} />
            {err && <Msg tone="err">{err}</Msg>}
            {notice && <Msg tone="ok">{notice}</Msg>}
            <Button type="submit" variant="primary" disabled={busy} style={{ width: "100%", marginTop: 4 }}>{busy ? "Verifying…" : "Verify & continue"}</Button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button type="button" onClick={() => { setStep("creds"); setErr(null); setNotice(null); }} style={linkBtn}>← Back</button>
              <button type="button" onClick={resend} disabled={busy} style={linkBtn}>Resend code</button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitCreds}>
            <div style={{ fontSize: 20, fontWeight: 650, color: C.ink, marginBottom: 6 }}>{mode === "signup" ? "Create your account" : "Sign in"}</div>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>Restricted to <strong>backstory.ai</strong> and <strong>people.ai</strong> email addresses.</div>

            <label style={lbl}>Work email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@backstory.ai" autoFocus autoComplete="email" style={{ marginBottom: 12 }} />
            <label style={lbl}>Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} style={{ marginBottom: 12 }} />

            {err && <Msg tone="err">{err}</Msg>}
            {notice && <Msg tone="ok">{notice}</Msg>}

            <Button type="submit" variant="primary" disabled={busy} style={{ width: "100%", marginTop: 4 }}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>

            <div style={{ fontSize: 13, color: C.muted, marginTop: 16, textAlign: "center" }}>
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(null); setNotice(null); }} style={{ ...linkBtn, fontWeight: 600 }}>
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Map a few Supabase auth errors to friendlier copy; pass others through.
function friendly(msg = "") {
  if (/Database error saving new user/i.test(msg)) return "Sign-up is restricted to backstory.ai and people.ai email addresses.";
  if (/User already registered/i.test(msg)) return "That email already has an account — try signing in.";
  if (/Invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/Token has expired or is invalid/i.test(msg)) return "That code is invalid or expired — request a new one.";
  return msg;
}

const lbl = { display: "block", fontSize: 12.5, fontWeight: 600, color: C.body, marginBottom: 6 };
const linkBtn = { border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 };

function Msg({ tone, children }) {
  const ok = tone === "ok";
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.5, padding: "9px 12px", borderRadius: 9, marginBottom: 12, background: ok ? C.greenSoft : C.redSoft, color: ok ? "#15803D" : C.red, border: `1px solid ${ok ? "#BBE7CB" : C.redSoft}` }}>{children}</div>
  );
}
