import {
  storage,
  type CourseRecord,
  type WeekContent,
  type WeekContentWithKey,
} from "@/lib/storage";
import type { LearningStateView } from "@/lib/state/schema";

/**
 * Mode router — two loaders distinguished by whether they may return solutionKey.
 *   loadGradedContext — INCLUDES solutionKey. For assessment authoring + grading.
 *   loadSafeContext   — EXCLUDES solutionKey. For lecture, tutor, state extraction.
 * Both also return the course (background level, totalWeeks) and the learning state.
 */

export type Mode =
  | "lecture"
  | "assessment"
  | "tutor"
  | "grading"
  | "state-extract";

type SafeMode = Extract<Mode, "lecture" | "tutor" | "state-extract">;
type GradedMode = Extract<Mode, "assessment" | "grading">;

export interface SafeContext {
  mode: SafeMode;
  course: CourseRecord | null;
  week: WeekContent | null;
  state: LearningStateView;
}

export interface GradedContext {
  mode: GradedMode;
  course: CourseRecord | null;
  week: WeekContentWithKey | null;
  state: LearningStateView;
}

export async function loadSafeContext(
  mode: SafeMode,
  courseId: string,
  weekNumber: number,
): Promise<SafeContext> {
  const [course, week, state] = await Promise.all([
    storage.getCourse(courseId),
    storage.getWeekForTutor(courseId, weekNumber),
    storage.getLearningStateView(courseId),
  ]);
  return { mode, course, week, state };
}

export async function loadGradedContext(
  mode: GradedMode,
  courseId: string,
  weekNumber: number,
): Promise<GradedContext> {
  const [course, week, state] = await Promise.all([
    storage.getCourse(courseId),
    storage.getWeekWithKey(courseId, weekNumber),
    storage.getLearningStateView(courseId),
  ]);
  return { mode, course, week, state };
}
