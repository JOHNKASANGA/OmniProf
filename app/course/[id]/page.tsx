"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import mermaid from "mermaid";
import "katex/dist/katex.min.css";

interface Course {
  id: string;
  studentId: string;
  courseCode: string;
  title: string;
  backgroundLevel: string;
}
interface WeekRef {
  weekNumber: number;
  topic: string;
  keyConcepts: string[];
  deliverables: string[];
}
interface Curriculum {
  courseTitle: string;
  totalWeeks: number;
  weeks: WeekRef[];
}
interface LectureData {
  lecture: string;
  cached: boolean;
  weekNumber: number;
}

interface Problem {
  id?: string;
  prompt?: string;
  question?: string;
  difficulty?: string;
}
interface ProblemSet {
  problems?: Problem[];
}

interface TutorMsg {
  id?: string;
  role: string;
  content: string;
  createdAt?: string;
}

type Tab = "lecture" | "assessment" | "tutor";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const SOFT_BG = "rgba(99, 102, 241, 0.06)";

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params.id;

  const [student, setStudent] = useState<{
    name: string;
    yearLevel: number;
  } | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [tab, setTab] = useState<Tab>("lecture");
  const [error, setError] = useState<string | null>(null);

  const [lecture, setLecture] = useState<LectureData | null>(null);
  const [loadingLecture, setLoadingLecture] = useState(false);
  const [generatingLecture, setGeneratingLecture] = useState(false);

  const [problemSet, setProblemSet] = useState<ProblemSet | null>(null);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [generatingProblems, setGeneratingProblems] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<{
    feedback?: string;
    score?: number;
  } | null>(null);

  const [tutorMessages, setTutorMessages] = useState<TutorMsg[]>([]);
  const [loadingTutor, setLoadingTutor] = useState(false);
  const [tutorInput, setTutorInput] = useState("");
  const [sendingTutor, setSendingTutor] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const tutorEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.student) router.push("/signin");
        else setStudent(d.student);
      });
  }, [router]);

  useEffect(() => {
    if (!student || !courseId) return;
    fetch(`/api/course/${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.course) {
          setCourse(d.course);
          setCurriculum(d.curriculum);
        } else setError(d.error || "Failed to load course");
      });
  }, [student, courseId]);

  useEffect(() => {
    if (!course) return;
    setLoadingLecture(true);
    setLecture(null);
    fetch(`/api/lecture/${courseId}/${activeWeek}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lecture) setLecture(d.lecture);
      })
      .finally(() => setLoadingLecture(false));
  }, [course, courseId, activeWeek]);

  useEffect(() => {
    if (!course) return;
    setLoadingProblems(true);
    setProblemSet(null);
    setSubmission(null);
    setAnswer("");
    fetch(`/api/assessment/${courseId}/${activeWeek}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.problemSet) setProblemSet(d.problemSet);
      })
      .finally(() => setLoadingProblems(false));
  }, [course, courseId, activeWeek]);

  useEffect(() => {
    if (!course) return;
    setLoadingTutor(true);
    setTutorMessages([]);
    fetch(`/api/tutor/${courseId}/${activeWeek}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages)) setTutorMessages(d.messages);
      })
      .finally(() => setLoadingTutor(false));
  }, [course, courseId, activeWeek]);

  useEffect(() => {
    if (lecture?.lecture && tab === "lecture") {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });
      setTimeout(() => {
        try {
          mermaid.run({ querySelector: ".mermaid" });
        } catch {}
      }, 50);
    }
  }, [lecture, tab]);

  useEffect(() => {
    tutorEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMessages, tab]);

  async function generateLecture() {
    setGeneratingLecture(true);
    setError(null);
    try {
      const r = await fetch(`/api/lecture/${courseId}/${activeWeek}`, {
        method: "POST",
      });
      const d = await r.json();
      if (r.ok && d.lecture) setLecture(d.lecture);
      else setError(d.error || "Lecture generation failed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingLecture(false);
    }
  }

  async function generateProblems() {
    setGeneratingProblems(true);
    setError(null);
    try {
      const r = await fetch(`/api/assessment/${courseId}/${activeWeek}`, {
        method: "POST",
      });
      const d = await r.json();
      if (r.ok && d.problemSet) setProblemSet(d.problemSet);
      else setError(d.error || "Assessment generation failed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingProblems(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/submission/${courseId}/${activeWeek}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: answer.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setSubmission(d);
        setAnswer("");
      } else setError(d.error || "Submission failed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendTutor() {
    if (!tutorInput.trim()) return;
    const myMsg: TutorMsg = {
      role: "student",
      content: tutorInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setTutorMessages((prev) => [...prev, myMsg]);
    setTutorInput("");
    setSendingTutor(true);
    setError(null);
    try {
      const r = await fetch(`/api/tutor/${courseId}/${activeWeek}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: myMsg.content }),
      });
      const d = await r.json();
      if (r.ok && d.message) {
        setTutorMessages((prev) => [
          ...prev,
          {
            role: "tutor",
            content: d.message,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else if (r.ok && Array.isArray(d.messages)) {
        setTutorMessages(d.messages);
      } else if (r.ok && typeof d.reply === "string") {
        setTutorMessages((prev) => [
          ...prev,
          {
            role: "tutor",
            content: d.reply,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setError(d.error || "Tutor failed");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingTutor(false);
    }
  }

  async function endSession() {
    setEndingSession(true);
    setError(null);
    try {
      const r = await fetch(`/api/state/${courseId}/${activeWeek}`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || "State extraction failed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEndingSession(false);
    }
  }

  if (!student) return null;
  if (!course || !curriculum) {
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
        {error || "Loading…"}
      </main>
    );
  }

  const week = curriculum.weeks.find((w) => w.weekNumber === activeWeek);

  return (
    <main
      style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 6rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          ← Home
        </Link>
        <div className="avatar">{initials(student.name)}</div>
      </div>

      <div className="glow-bg" style={{ marginBottom: "2.5rem" }}>
        <div className="label" style={{ marginBottom: "0.5rem" }}>
          {course.courseCode}
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
            margin: 0,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          <span className="text-gradient">{course.title}</span>
        </h1>
        <p style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>
          {curriculum.totalWeeks} weeks ·{" "}
          {curriculum.weeks.reduce((n, w) => n + w.keyConcepts.length, 0)}{" "}
          concepts
        </p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div className="label" style={{ marginBottom: "0.75rem" }}>
          Weeks
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "0.5rem",
          }}
        >
          {curriculum.weeks.map((w) => (
            <button
              key={w.weekNumber}
              onClick={() => setActiveWeek(w.weekNumber)}
              className={activeWeek === w.weekNumber ? "btn" : "btn-ghost"}
              style={{
                flexShrink: 0,
                padding: "0.6rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Week {w.weekNumber}
            </button>
          ))}
        </div>
      </div>

      {week && (
        <div className="card-bubble" style={{ marginBottom: "2rem" }}>
          <h2
            className="font-display"
            style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}
          >
            Week {week.weekNumber} · {week.topic}
          </h2>
          <div
            style={{
              marginTop: "1.25rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div>
              <div className="label" style={{ marginBottom: "0.5rem" }}>
                Key concepts
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1.1rem",
                  color: "var(--text-muted)",
                }}
              >
                {week.keyConcepts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="label" style={{ marginBottom: "0.5rem" }}>
                Deliverables
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1.1rem",
                  color: "var(--text-muted)",
                }}
              >
                {week.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {(["lecture", "assessment", "tutor"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.7rem 1.2rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              textTransform: "capitalize",
              background: "transparent",
              border: "none",
              color: tab === t ? "var(--accent-1)" : "var(--text-muted)",
              borderBottom:
                tab === t
                  ? "2px solid var(--accent-1)"
                  : "2px solid transparent",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "lecture" && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>
              Lecture
            </h2>
            {!lecture && !loadingLecture && (
              <button
                className="btn"
                onClick={generateLecture}
                disabled={generatingLecture}
              >
                {generatingLecture
                  ? "Writing the lecture…"
                  : "Generate lecture"}
              </button>
            )}
            {lecture && !generatingLecture && (
              <button
                className="btn-ghost"
                onClick={generateLecture}
                disabled={generatingLecture}
              >
                Regenerate
              </button>
            )}
          </div>
          {loadingLecture && (
            <div style={{ color: "var(--text-muted)" }}>Loading…</div>
          )}
          {!loadingLecture && !lecture && !generatingLecture && (
            <div style={{ color: "var(--text-muted)" }}>
              No lecture yet for this week. Generate one.
            </div>
          )}
          {lecture && (
            <article className="prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({
                    className,
                    children,
                    ...rest
                  }: {
                    className?: string;
                    children?: React.ReactNode;
                  }) {
                    if (className?.includes("language-mermaid")) {
                      return <div className="mermaid">{String(children)}</div>;
                    }
                    return (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {lecture.lecture}
              </ReactMarkdown>
            </article>
          )}
        </div>
      )}

      {tab === "assessment" && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>
              Assessment
            </h2>
            {!problemSet && !loadingProblems && (
              <button
                className="btn"
                onClick={generateProblems}
                disabled={generatingProblems}
              >
                {generatingProblems ? "Writing problems…" : "Generate problems"}
              </button>
            )}
            {problemSet && !generatingProblems && (
              <button
                className="btn-ghost"
                onClick={generateProblems}
                disabled={generatingProblems}
              >
                Regenerate
              </button>
            )}
          </div>
          {loadingProblems && (
            <div style={{ color: "var(--text-muted)" }}>Loading…</div>
          )}
          {!loadingProblems && !problemSet && !generatingProblems && (
            <div style={{ color: "var(--text-muted)" }}>
              No problem set yet for this week. Generate one.
            </div>
          )}
          {problemSet && (
            <div>
              {Array.isArray(problemSet.problems) &&
                problemSet.problems.map((p, i) => (
                  <div
                    key={p.id ?? i}
                    style={{
                      marginBottom: "1.25rem",
                      padding: "1rem 1.2rem",
                      background: SOFT_BG,
                      borderRadius: "14px",
                    }}
                  >
                    <div className="label" style={{ marginBottom: "0.5rem" }}>
                      Problem {i + 1}
                      {p.difficulty ? ` · ${p.difficulty}` : ""}
                    </div>
                    <div
                      style={{ color: "var(--text)", whiteSpace: "pre-wrap" }}
                    >
                      {p.prompt || p.question || JSON.stringify(p)}
                    </div>
                  </div>
                ))}
              <div
                className="label"
                style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}
              >
                Your answer
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Show your reasoning. Math, words, sketches in markdown — all welcome."
                rows={8}
              />
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btn"
                  onClick={submitAnswer}
                  disabled={submitting || !answer.trim()}
                >
                  {submitting ? "Grading…" : "Submit"}
                </button>
              </div>
              {submission && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1.25rem",
                    background: SOFT_BG,
                    borderRadius: "14px",
                  }}
                >
                  <div className="label" style={{ marginBottom: "0.5rem" }}>
                    Feedback
                    {typeof submission.score === "number"
                      ? ` · ${Math.round(submission.score * 100)}%`
                      : ""}
                  </div>
                  <article className="prose" style={{ marginTop: "0.5rem" }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {submission.feedback ||
                        JSON.stringify(submission, null, 2)}
                    </ReactMarkdown>
                  </article>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "tutor" && (
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            display: "flex",
            flexDirection: "column",
            minHeight: "500px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>
              Socratic tutor
            </h2>
            {tutorMessages.length > 0 && (
              <button
                className="btn-ghost"
                onClick={endSession}
                disabled={endingSession}
              >
                {endingSession ? "Extracting state…" : "End session"}
              </button>
            )}
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              paddingRight: "0.25rem",
              maxHeight: "500px",
            }}
          >
            {loadingTutor && (
              <div style={{ color: "var(--text-muted)" }}>Loading…</div>
            )}
            {!loadingTutor && tutorMessages.length === 0 && (
              <div style={{ color: "var(--text-muted)" }}>
                Start the conversation. The tutor will guide — not give answers.
              </div>
            )}
            {tutorMessages.map((m, i) => (
              <div
                key={m.id ?? i}
                style={{
                  alignSelf: m.role === "student" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "18px",
                  background:
                    m.role === "student"
                      ? "linear-gradient(135deg, var(--accent-1), var(--accent-2))"
                      : SOFT_BG,
                  color: m.role === "student" ? "white" : "var(--text)",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                {m.role === "student" ? (
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                ) : (
                  <article className="prose">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
            ))}
            <div ref={tutorEndRef} />
          </div>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendTutor();
                }
              }}
              placeholder="Ask the tutor (Enter to send, Shift+Enter for newline)"
              rows={2}
              style={{ flex: 1, resize: "none" }}
            />
            <button
              className="btn"
              onClick={sendTutor}
              disabled={sendingTutor || !tutorInput.trim()}
            >
              {sendingTutor ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            color: "var(--error)",
            fontSize: "0.9rem",
            padding: "0.75rem 1rem",
            background: "rgba(220, 38, 38, 0.06)",
            borderRadius: "10px",
            border: "1px solid rgba(220, 38, 38, 0.20)",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}
    </main>
  );
}
