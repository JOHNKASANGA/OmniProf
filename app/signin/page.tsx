"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Fill all fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const d = await r.json();
      if (r.ok) router.push("/");
      else setError(d.error || "Sign in failed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          className="glow-bg"
          style={{ textAlign: "center", marginBottom: "2rem" }}
        >
          <h1
            className="font-display"
            style={{
              fontSize: "2.5rem",
              margin: 0,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            <span className="text-gradient">Welcome back</span>
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              color: "var(--text-muted)",
              fontSize: "1rem",
            }}
          >
            Sign in to pick up where you left off.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="card-bubble"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--error)",
                fontSize: "0.9rem",
                padding: "0.75rem 1rem",
                background: "rgba(220, 38, 38, 0.06)",
                borderRadius: "10px",
                border: "1px solid rgba(220, 38, 38, 0.20)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={submitting}
            style={{ marginTop: "0.25rem" }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          New here?{" "}
          <Link
            href="/signup"
            style={{
              color: "var(--accent-1)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
