"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  yearLevel: number;
  profilePicture: string | null;
}
interface Course {
  id: string;
  title: string;
  courseCode: string;
  totalWeeks: number;
  status: string;
  createdAt: string;
}
interface CheckIn {
  todayChecked: boolean;
  streak: number;
  reflection: string | null;
}
interface Stats {
  totalConcepts: number;
  masteredConcepts: number;
  avgPerformance: number;
  submissionCount: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

function GradientDonut({
  value,
  total,
  label,
  sublabel,
  gradientId,
}: {
  value: number;
  total: number;
  label: string;
  sublabel: string;
  gradientId: string;
}) {
  const size = 180;
  const thickness = 18;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          className="font-display"
          style={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginTop: "0.25rem",
            letterSpacing: "0.04em",
          }}
        >
          {sublabel}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [checkin, setCheckin] = useState<CheckIn>({
    todayChecked: false,
    streak: 0,
    reflection: null,
  });
  const [stats, setStats] = useState<Stats>({
    totalConcepts: 0,
    masteredConcepts: 0,
    avgPerformance: 0,
    submissionCount: 0,
  });
  const [reflection, setReflection] = useState("");
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me").then((r) => r.json());
        if (!me.student) {
          router.push("/signin");
          return;
        }
        setStudent(me.student);
        const [c, ci, st] = await Promise.all([
          fetch("/api/course").then((r) => r.json()),
          fetch("/api/checkin").then((r) => r.json()),
          fetch("/api/stats").then((r) => r.json()),
        ]);
        setCourses(c.courses ?? []);
        setCheckin({
          todayChecked: !!ci.todayChecked,
          streak: ci.streak ?? 0,
          reflection: ci.reflection ?? null,
        });
        setStats(st);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function doCheckIn() {
    setSubmittingCheckin(true);
    try {
      const r = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection: reflection.trim() || undefined }),
      });
      const d = await r.json();
      if (r.ok) {
        setCheckin({
          todayChecked: true,
          streak: d.streak,
          reflection: reflection.trim() || null,
        });
        setReflection("");
      }
    } finally {
      setSubmittingCheckin(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/signin");
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        Loading…
      </main>
    );
  }
  if (!student) return null;

  return (
    <main
      style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 6rem" }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "3rem",
        }}
      >
        <div
          className="font-display"
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "-0.01em",
          }}
        >
          OmniProfessor
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="avatar">{initials(student.name)}</div>
          <button
            onClick={signOut}
            className="btn-ghost"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 10,
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Greeting */}
      <section className="glow-bg" style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            margin: 0,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
          }}
        >
          Hey, <span className="text-gradient">{firstName(student.name)}</span>
        </h1>
        <p
          style={{
            marginTop: "0.75rem",
            color: "var(--text-muted)",
            fontSize: "1.05rem",
          }}
        >
          {student.yearLevel}L ·{" "}
          {checkin.streak > 0
            ? `${checkin.streak}-day streak — keep going`
            : "ready for today?"}
        </p>
      </section>

      {/* Daily check-in */}
      <section className="card" style={{ marginBottom: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <div className="section-title">Today's check-in</div>
            {checkin.todayChecked ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--success)" }}>✓</span> Checked in
                </div>
                {checkin.reflection && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    "{checkin.reflection}"
                  </div>
                )}
              </>
            ) : (
              <>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What will you focus on today? (optional)"
                  rows={2}
                  style={{ marginBottom: "0.75rem" }}
                />
                <button
                  className="btn"
                  onClick={doCheckIn}
                  disabled={submittingCheckin}
                >
                  {submittingCheckin ? "Checking in…" : "Check in for today"}
                </button>
              </>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              className="font-display"
              style={{ fontSize: "2.4rem", fontWeight: 700, lineHeight: 1 }}
            >
              {checkin.streak}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              day streak
            </div>
          </div>
        </div>
      </section>

      {/* Course tiles */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div className="section-title" style={{ marginLeft: "0.5rem" }}>
          Your courses
        </div>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            overflowX: "auto",
            paddingBottom: "1rem",
            scrollbarWidth: "thin",
          }}
        >
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/course/${c.id}`}
              className="tile"
              style={{ minWidth: 280, maxWidth: 280, flexShrink: 0 }}
            >
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: "var(--accent-1)",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                {c.courseCode}
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  marginBottom: "0.75rem",
                  minHeight: "3.2em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {c.title}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {c.totalWeeks} weeks · {c.status}
              </div>
            </Link>
          ))}
          <Link
            href="/course/new"
            className="tile"
            style={{
              minWidth: 200,
              maxWidth: 200,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderStyle: "dashed",
              borderColor: "var(--border-strong)",
              background: "var(--gradient-soft)",
            }}
          >
            <div
              className="text-gradient font-display"
              style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1 }}
            >
              +
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              Add course
            </div>
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div
        style={{
          height: 1,
          margin: "0 0 2.5rem",
          background:
            "linear-gradient(90deg, transparent, var(--border-strong) 20%, var(--border-strong) 80%, transparent)",
          boxShadow: "0 6px 12px -8px rgba(15, 23, 42, 0.10)",
        }}
      />

      {/* Stats donuts */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <div
          className="card"
          style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}
        >
          <GradientDonut
            gradientId="g-mastery"
            value={stats.masteredConcepts}
            total={stats.totalConcepts}
            label={
              stats.totalConcepts > 0
                ? `${stats.masteredConcepts}/${stats.totalConcepts}`
                : "—"
            }
            sublabel="MASTERED"
          />
          <div style={{ flex: 1 }}>
            <div
              className="font-display"
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Concept mastery
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              Concepts you've shown solid grasp of across all courses, out of
              every concept that's been taught.
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}
        >
          <GradientDonut
            gradientId="g-perf"
            value={stats.avgPerformance}
            total={1}
            label={
              stats.submissionCount > 0
                ? `${Math.round(stats.avgPerformance * 100)}%`
                : "—"
            }
            sublabel={
              stats.submissionCount > 0
                ? `${stats.submissionCount} ${stats.submissionCount === 1 ? "TEST" : "TESTS"}`
                : "NO TESTS YET"
            }
          />
          <div style={{ flex: 1 }}>
            <div
              className="font-display"
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Practice performance
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              Average score across every problem set you've submitted.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
