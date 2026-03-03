"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Github, Mail, Lock, Loader2, LogOut } from "lucide-react";
import {
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  getSession,
  onAuthStateChange,
  isAuthEnabled,
  type User,
  type Session,
} from "@/lib/auth";

interface AuthGateProps {
  children: (user: User | null) => React.ReactNode;
}

/**
 * AuthGate wraps the app. If Supabase Auth is configured, it shows
 * a login/signup screen until the user is authenticated.
 * If Auth is NOT configured (no env vars), it renders children with user=null.
 */
export default function AuthGate({ children }: AuthGateProps) {
  const authEnabled = isAuthEnabled();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!authEnabled) return;

    // Check existing session
    getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });

    // Listen for auth changes
    const unsub = onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return unsub;
  }, [authEnabled]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--d3-bg)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--d3-text-muted)" }} />
      </div>
    );
  }

  // Auth not configured — skip login, render app directly
  if (!authEnabled) {
    return <>{children(null)}</>;
  }

  // Not logged in — show auth screen
  if (!session?.user) {
    return <AuthScreen />;
  }

  // Logged in — render app
  return <>{children(session.user)}</>;
}

/**
 * User menu button (for use in the app bar).
 */
export function UserMenu({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const email = user.email || "User";
  const initial = email[0].toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
        style={{
          background: "var(--d3-glass)",
          border: "1px solid var(--d3-glass-border)",
          color: "var(--d3-text)",
        }}
        title={email}
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-9 z-50 rounded-lg p-2 min-w-[180px]"
            style={{
              background: "var(--d3-surface)",
              border: "1px solid var(--d3-glass-border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <div className="px-2 py-1.5 text-[10px] text-white/30 truncate">{email}</div>
            <button
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] hover:bg-white/5 transition-colors"
              style={{ color: "var(--d3-text-muted)" }}
            >
              <LogOut size={12} />
              Abmelden
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Auth Screen (Login / Signup) ──

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        if (mode === "signup") {
          await signUp(email, password);
          setConfirmSent(true);
        } else {
          await signIn(email, password);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [mode, email, password]
  );

  const handleGitHub = useCallback(async () => {
    try {
      await signInWithProvider("github");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  if (confirmSent) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--d3-bg)" }}>
        <div
          className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
          style={{
            background: "var(--d3-surface)",
            border: "1px solid var(--d3-glass-border)",
            boxShadow: "0 16px 64px rgba(0,0,0,0.3)",
          }}
        >
          <Mail size={32} className="mx-auto mb-4" style={{ color: "var(--d3-accent)" }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--d3-text)" }}>
            Check deine E-Mail
          </h2>
          <p className="text-sm" style={{ color: "var(--d3-text-muted)" }}>
            Wir haben dir einen Bestätigungslink an <strong>{email}</strong> geschickt.
          </p>
          <button
            onClick={() => {
              setConfirmSent(false);
              setMode("login");
            }}
            className="mt-6 text-[12px] underline"
            style={{ color: "var(--d3-accent)" }}
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--d3-bg)" }}>
      <div
        className="rounded-2xl p-8 max-w-sm w-full mx-4"
        style={{
          background: "var(--d3-surface)",
          border: "1px solid var(--d3-glass-border)",
          boxShadow: "0 16px 64px rgba(0,0,0,0.3)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--d3-text)" }}>
            D³ Studio
          </h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--d3-text-muted)" }}>
            {mode === "login" ? "Willkommen zurück" : "Account erstellen"}
          </p>
        </div>

        {/* GitHub login */}
        <button
          onClick={handleGitHub}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all mb-4"
          style={{
            background: "var(--d3-glass)",
            border: "1px solid var(--d3-glass-border)",
            color: "var(--d3-text)",
          }}
        >
          <Github size={16} />
          Mit GitHub anmelden
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: "var(--d3-glass-border)" }} />
          <span className="text-[10px]" style={{ color: "var(--d3-text-muted)" }}>oder</span>
          <div className="flex-1 h-px" style={{ background: "var(--d3-glass-border)" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--d3-text-muted)" }} />
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{
                background: "var(--d3-glass)",
                border: "1px solid var(--d3-glass-border)",
                color: "var(--d3-text)",
              }}
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--d3-text-muted)" }} />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{
                background: "var(--d3-glass)",
                border: "1px solid var(--d3-glass-border)",
                color: "var(--d3-text)",
              }}
            />
          </div>

          {error && (
            <div className="text-[11px] text-red-400 px-1">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{
              background: "var(--d3-accent)",
              color: "#fff",
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : mode === "login" ? (
              "Anmelden"
            ) : (
              "Registrieren"
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-[11px]"
            style={{ color: "var(--d3-accent)" }}
          >
            {mode === "login"
              ? "Noch kein Account? Registrieren"
              : "Schon einen Account? Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}
