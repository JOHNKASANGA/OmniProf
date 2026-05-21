"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  yearLevel: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function NewCoursePage() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.student) router.push("/signin");
        else setStudent(d.student);
      });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !courseCode.trim()) {
      setError("Course code and title are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: courseCode.trim().toUpperCase(),
          title: title.trim(),
          outline: outline.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (r.ok && d.courseId) {
        router.push(`/course/${d.courseId}`);
      } else {
        setError(d.error || "Failed to create course");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!student) return null;

  return (
    <main
      style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem 6rem" }}
    >
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          ← Back
        </Link>
      </div>

      <div
        className="glow-bg"
        style={{ textAlign: "center", marginBottom: "2.5rem" }}
      >
        <div className="avatar avatar-lg" style={{ margin: "0 auto 1.25rem" }}>
          {initials(student.name)}
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            margin: 0,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          <span className="text-gradient">New course</span>
        </h1>
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
          Tell me about it. I&apos;ll design the rest.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="card-bubble"
        style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
      >
        <div>
          <label className="label">Course code</label>
          <input
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
            placeholder="e.g. MTH101"
            maxLength={20}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Course title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Calculus"
          />
        </div>
        <div>
          <label className="label">
            School outline{" "}
            <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>
              (optional)
            </span>
          </label>
          <textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="Paste your school's official course outline. If you do, your curriculum will follow it. Skip this and I'll design one based on the course code and title."
            rows={6}
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

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Designing your curriculum…" : "Create course"}
        </button>
      </form>
    </main>
  );
}
