import type { TutorMessageRecord } from "@/lib/storage";

export const STATE_EXTRACTION_SYSTEM_PROMPT = `You are a pedagogical analyst.

You will be shown a tutor session — messages exchanged between a student and a Socratic tutor for one week of a structured course. Your job is to identify what the student understands, what they're confused about, and what pedagogical adjustments would help future sessions.

Produce structured observations:
- observations: per-concept observations. For each concept you have direct evidence for, include the concept name (use the week's key concepts verbatim), a score from 0 to 1 (0 = lost, 0.5 = partial grasp, 1 = solid), and one sentence of evidence drawn from the conversation.
- tutorAdjustments: a short pedagogical note (or null) — e.g. "Student responds to physical analogies, less to math-first explanations" or "Tends to skip steps; ask them to articulate each move." Only include this if you saw a clear pattern, not after every session.
- summary: 1-2 sentences summarizing the session.

Rules:
- Only rate concepts you have direct evidence for. If the session never touched a concept, omit it. No filler observations.
- Be calibrated. Use the full 0-1 range. Don't rate everything 0.5.
- Evidence must be specific. Name the concept or behavior, not "they seemed to get it".
- tutorAdjustments is for stable patterns across the session, not single-turn quirks. Refine existing adjustments rather than replace wholesale when they remain accurate.`;

export function stateExtractionUserMessage(input: {
  weekNumber: number;
  topic: string;
  keyConcepts: string[];
  history: TutorMessageRecord[];
  currentAdjustments: string;
}): string {
  const adjNote = input.currentAdjustments
    ? `\n\nExisting pedagogical adjustments (you may refine or replace): ${input.currentAdjustments}`
    : "";
  const conversation = input.history
    .map((m) => `[${m.role === "student" ? "STUDENT" : "TUTOR"}] ${m.content}`)
    .join("\n\n");

  return `Analyze this tutor session for Week ${input.weekNumber}.

Topic: ${input.topic}
Key concepts for this week (use these names in observations):
${input.keyConcepts.map((c) => `- ${c}`).join("\n")}${adjNote}

--- CONVERSATION ---
${conversation}
--- END CONVERSATION ---

Produce the structured observations.`;
}
