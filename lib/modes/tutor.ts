import { llm } from "@/lib/llm";
import { storage } from "@/lib/storage";
import { loadSafeContext } from "./router";
import { TUTOR_SYSTEM_PROMPT, tutorContextBlock } from "@/lib/prompts/tutor";
import type { LLMMessage } from "@/lib/llm";

export interface TutorTurnResult {
  reply: string;
  weekNumber: number;
}

export async function respondToTutor(input: {
  courseId: string;
  weekNumber: number;
  studentMessage: string;
  historyLimit?: number;
}): Promise<TutorTurnResult> {
  const ctx = await loadSafeContext("tutor", input.courseId, input.weekNumber);
  if (!ctx.course) throw new Error(`Course ${input.courseId} not found`);
  if (!ctx.week) throw new Error(`Week ${input.weekNumber} not found`);

  const history = await storage.getTutorHistory(
    input.courseId,
    input.weekNumber,
    input.historyLimit ?? 40,
  );

  const messages: LLMMessage[] = [
    ...history.map((m) => ({
      role: (m.role === "student" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.content,
    })),
    { role: "user", content: input.studentMessage },
  ];

  const systemPrompt =
    TUTOR_SYSTEM_PROMPT +
    tutorContextBlock({
      weekNumber: ctx.week.weekNumber,
      topic: ctx.week.topic,
      keyConcepts: ctx.week.keyConcepts,
      lecture: ctx.week.lecture,
      backgroundLevel: ctx.course.backgroundLevel,
      state: ctx.state,
    });

  const reply = await llm.generateText({
    system: systemPrompt,
    messages,
    temperature: 0.6,
    maxTokens: 1024,
  });

  await storage.appendTutorMessage({
    courseId: input.courseId,
    weekNumber: input.weekNumber,
    role: "student",
    content: input.studentMessage,
  });
  await storage.appendTutorMessage({
    courseId: input.courseId,
    weekNumber: input.weekNumber,
    role: "tutor",
    content: reply,
  });

  return { reply, weekNumber: ctx.week.weekNumber };
}
