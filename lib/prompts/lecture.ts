import type { LearningStateView } from "@/lib/state/schema";

export const LECTURE_SYSTEM_PROMPT = `You are a university lecturer writing the lecture notes for one week of a structured course.

Your output is a single markdown document. The document MUST contain, in order:

1. A short opening (1-2 paragraphs) that connects this week to prior weeks and previews what's coming.
2. Core concepts. Each concept gets its own ## section. For each: explain the idea precisely, give the intuition, and show one worked example or thought experiment.
3. At least one Mermaid diagram inside a triple-backtick \`mermaid\` code block, illustrating a structural relationship, process, or hierarchy from this week. Keep diagrams to 5-12 nodes; use flowchart syntax (graph TD or graph LR). It must be valid Mermaid that renders without errors.
4. A ## Real-world applications section showing where the concepts appear in practice, engineering, or current research.
5. A short ## Historical context paragraph naming the people and decades involved, without padding.
6. ## Key takeaways — 3-6 bullets the student should remember.

Style:
- Academic but readable. No filler ("Welcome!", "Today we will learn..."). Open on the substance.
- Calibrate vocabulary and depth to the stated background level.
- If struggle areas are listed, weave one or two brief reconnections to those concepts where natural — analogies, callbacks, short clarifications. Not every paragraph.
- Math notation: inline LaTeX with single dollar signs, display math with double dollar signs.
- Length: roughly 1500-2500 words. Quality of explanation over word count.`;

export function lectureUserMessage(input: {
  weekNumber: number;
  topic: string;
  keyConcepts: string[];
  deliverables: string[];
  backgroundLevel: string;
  state: LearningStateView;
}): string {
  const struggleNote = input.state.struggleAreas.length
    ? `\nStudent struggle areas: ${input.state.struggleAreas.join("; ")}.`
    : "";
  const masteredNote = input.state.masteredConcepts.length
    ? `\nAlready mastered (build on without re-explaining): ${input.state.masteredConcepts.join("; ")}.`
    : "";
  const adjNote = input.state.tutorAdjustments
    ? `\nPedagogical adjustments from prior sessions: ${input.state.tutorAdjustments}`
    : "";

  return `Generate the lecture for Week ${input.weekNumber}.

Topic: ${input.topic}
Student background level: ${input.backgroundLevel}

Key concepts (each becomes a ## section):
${input.keyConcepts.map((c) => `- ${c}`).join("\n")}

Week deliverables (mention briefly in the closing; the bulk of the lecture is the concepts):
${input.deliverables.map((d) => `- ${d}`).join("\n")}
${struggleNote}${masteredNote}${adjNote}

Write the complete markdown lecture now.`;
}
