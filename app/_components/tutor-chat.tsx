"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "student" | "tutor";
  content: string;
  createdAt: string;
}

export function TutorChat({
  courseId,
  weekNumber,
}: {
  courseId: string;
  weekNumber: number;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/tutor/${courseId}/${weekNumber}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]));
  }, [courseId, weekNumber]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    setMessages((m) => [
      ...m,
      {
        id: `temp-${Date.now()}`,
        role: "student",
        content: msg,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const r = await fetch(`/api/tutor/${courseId}/${weekNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Tutor failed");
        return;
      }
      const fresh = await fetch(`/api/tutor/${courseId}/${weekNumber}`).then(
        (rr) => rr.json(),
      );
      setMessages(fresh.messages ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "60vh",
        minHeight: 480,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 0.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            Ask a question to begin. The tutor will guide, not solve.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: m.role === "student" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "0.75rem 1rem",
                background:
                  m.role === "student" ? "var(--accent)" : "var(--bg-elevated)",
                color: m.role === "student" ? "#FFF" : "var(--text)",
                border:
                  m.role === "student" ? "none" : "1px solid var(--border)",
                borderRadius: 4,
                fontSize: "0.95rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              padding: "0.5rem 0",
            }}
          >
            Tutor is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>
      {error && (
        <div
          style={{
            color: "var(--error)",
            padding: "0.5rem 0",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginTop: "1rem",
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask a question…"
          rows={2}
          style={{ flex: 1 }}
          disabled={sending}
        />
        <button
          className="btn"
          onClick={send}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
