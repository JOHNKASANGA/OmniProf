import { llm } from "@/lib/llm";
import { storage } from "@/lib/storage";
import { loadSafeContext } from "./router";
import {
  LECTURE_SYSTEM_PROMPT,
  lectureUserMessage,
} from "@/lib/prompts/lecture";

export interface LectureResult {
  lecture: string;
  cached: boolean;
  weekNumber: number;
}

export async function generateLecture(input: {
  courseId: string;
  weekNumber: number;
  regenerate?: boolean;
}): Promise<LectureResult> {
  const ctx = await loadSafeContext(
    "lecture",
    input.courseId,
    input.weekNumber,
  );

  if (!ctx.course) {
    throw new Error(`Course ${input.courseId} not found`);
  }
  if (!ctx.week) {
    throw new Error(
      `Week ${input.weekNumber} not found in course ${input.courseId}`,
    );
  }

  if (ctx.week.lecture && !input.regenerate) {
    return {
      lecture: ctx.week.lecture,
      cached: true,
      weekNumber: ctx.week.weekNumber,
    };
  }

  const lecture = await llm.generateText({
    system: LECTURE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: lectureUserMessage({
          weekNumber: ctx.week.weekNumber,
          topic: ctx.week.topic,
          keyConcepts: ctx.week.keyConcepts,
          deliverables: ctx.week.deliverables,
          backgroundLevel: ctx.course.backgroundLevel,
          state: ctx.state,
        }),
      },
    ],
    temperature: 0.65,
    maxTokens: 8192,
  });

  await storage.saveLecture(input.courseId, input.weekNumber, lecture);
  return { lecture, cached: false, weekNumber: ctx.week.weekNumber };
}
export async function getCachedLecture(
  courseId: string,
  weekNumber: number,
): Promise<LectureResult | null> {
  const ctx = await loadSafeContext("lecture", courseId, weekNumber);
  if (!ctx.week || !ctx.week.lecture) return null;
  return {
    lecture: ctx.week.lecture,
    cached: true,
    weekNumber: ctx.week.weekNumber,
  };
}
