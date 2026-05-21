import { z } from "zod";

// Enum-like unions (Zod enums)
export const BackgroundLevelSchema = z.enum([
  "beginner",
  "highschool",
  "undergraduate",
  "graduate",
]);
export type BackgroundLevel = z.infer<typeof BackgroundLevelSchema>;

export const CourseStatusSchema = z.enum(["active", "completed", "archived"]);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

export const MasteryStatusSchema = z.enum([
  "struggling",
  "learning",
  "mastered",
]);
export type MasteryStatus = z.infer<typeof MasteryStatusSchema>;

export const TutorRoleSchema = z.enum(["student", "tutor"]);
export type TutorRole = z.infer<typeof TutorRoleSchema>;

export const DifficultySchema = z.enum(["recall", "application", "synthesis"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

// Mastery thresholds — the "what does mastered mean" decision lives here.
export const MASTERY_THRESHOLDS = { mastered: 0.8, learning: 0.5 } as const;

export function statusFromScore(score: number): MasteryStatus {
  if (score >= MASTERY_THRESHOLDS.mastered) return "mastered";
  if (score >= MASTERY_THRESHOLDS.learning) return "learning";
  return "struggling";
}

// JSON-encoded column shapes
export const ProblemSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  difficulty: DifficultySchema,
  points: z.number(),
});
export type Problem = z.infer<typeof ProblemSchema>;

export const ProblemSetSchema = z.object({
  weekNumber: z.number().int(),
  problems: z.array(ProblemSchema),
});
export type ProblemSet = z.infer<typeof ProblemSetSchema>;

export const SolutionSchema = z.object({
  problemId: z.string(),
  steps: z.array(z.string()),
  answer: z.string(),
});
export type Solution = z.infer<typeof SolutionSchema>;

export const SolutionKeySchema = z.object({
  weekNumber: z.number().int(),
  solutions: z.array(SolutionSchema),
});
export type SolutionKey = z.infer<typeof SolutionKeySchema>;

export const GradedFeedbackSchema = z.object({
  perProblem: z.array(
    z.object({
      problemId: z.string(),
      awarded: z.number(),
      comment: z.string(),
    }),
  ),
  overallComment: z.string(),
});
export type GradedFeedback = z.infer<typeof GradedFeedbackSchema>;

// Curriculum map — output of workflow step 2
export const CurriculumWeekSchema = z.object({
  weekNumber: z.number().int().min(1),
  topic: z.string().min(1),
  keyConcepts: z.array(z.string()).min(2).max(8),
  deliverables: z.array(z.string()).min(1).max(4),
});
export type CurriculumWeek = z.infer<typeof CurriculumWeekSchema>;

export const CurriculumMapSchema = z.object({
  courseTitle: z.string().min(1),
  courseSummary: z.string().min(1),
  totalWeeks: z.number().int().min(12).max(16),
  weeks: z.array(CurriculumWeekSchema).min(12).max(16),
});
export type CurriculumMap = z.infer<typeof CurriculumMapSchema>;

export const YearLevelSchema = z.union([
  z.literal(100),
  z.literal(200),
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
]);
export type YearLevel = z.infer<typeof YearLevelSchema>;

export function yearLevelToBackgroundLevel(year: YearLevel): BackgroundLevel {
  if (year >= 500) return "graduate";
  return "undergraduate";
}

export function yearLevelLabel(year: YearLevel): string {
  return `${year}L`;
}

// The learning state shape passed into prompts (derived from DB at read time)
export interface LearningStateView {
  currentWeek: number;
  masteredConcepts: string[];
  struggleAreas: string[];
  tutorAdjustments: string;
}
