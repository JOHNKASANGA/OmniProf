"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const YEAR_LEVELS = [100, 200, 300, 400, 500, 600] as const;

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !name.trim() ||
      !email.trim() ||
      password.length < 8 ||
      yearLevel === null
    ) {
      setError(
        "Fill all fields — password must be at least 8 characters, and pick a year level.",
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          yearLevel,
        }),
      });
      const d = await r.json();
      if (r.ok) router.push("/");
      else setError(d.error || "Sign up failed");
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
      <div style={{ width: "100%", maxWidth: 480 }}>
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
            <span className="text-gradient">Hello there</span>
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              color: "var(--text-muted)",
              fontSize: "1rem",
            }}
          >
            Set up your account to start learning.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="card-bubble"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div>
            <label className="label">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Year level</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.5rem",
              }}
            >
              {YEAR_LEVELS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYearLevel(y)}
                  style={{
                    padding: "0.7rem",
                    border:
                      yearLevel === y
                        ? "1px solid transparent"
                        : "1px solid var(--border)",
                    borderRadius: "12px",
                    background:
                      yearLevel === y
                        ? "var(--gradient-accent)"
                        : "var(--bg-elevated)",
                    color: yearLevel === y ? "#FFF" : "var(--text)",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    boxShadow: yearLevel === y ? "var(--shadow-glow)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {y}L
                </button>
              ))}
            </div>
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
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/signin"
            style={{
              color: "var(--accent-1)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
