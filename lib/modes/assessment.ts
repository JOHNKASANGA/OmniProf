import { z } from "zod";
import { llm } from "@/lib/llm";
import { storage } from "@/lib/storage";
import { loadGradedContext } from "./router";
import {
  ASSESSMENT_SYSTEM_PROMPT,
  assessmentUserMessage,
} from "@/lib/prompts/assessment";
import {
  GRADING_SYSTEM_PROMPT,
  gradingUserMessage,
} from "@/lib/prompts/grading";
import {
  GradedFeedbackSchema,
  ProblemSetSchema,
  SolutionKeySchema,
  type GradedFeedback,
  type ProblemSet,
} from "@/lib/state/schema";

const AssessmentBundleSchema = z.object({
  problemSet: ProblemSetSchema,
  solutionKey: SolutionKeySchema,
});

export interface AssessmentResult {
  problemSet: ProblemSet;
  cached: boolean;
  weekNumber: number;
}

export async function generateAssessment(input: {
  courseId: string;
  weekNumber: number;
  regenerate?: boolean;
}): Promise<AssessmentResult> {
  const ctx = await loadGradedContext(
    "assessment",
    input.courseId,
    input.weekNumber,
  );
  if (!ctx.course) throw new Error(`Course ${input.courseId} not found`);
  if (!ctx.week) throw new Error(`Week ${input.weekNumber} not found`);

  if (ctx.week.problemSet && !input.regenerate) {
    return {
      problemSet: ctx.week.problemSet,
      cached: true,
      weekNumber: ctx.week.weekNumber,
    };
  }

  const bundle = await llm.generateStructured({
    system: ASSESSMENT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: assessmentUserMessage({
          weekNumber: ctx.week.weekNumber,
          topic: ctx.week.topic,
          keyConcepts: ctx.week.keyConcepts,
          backgroundLevel: ctx.course.backgroundLevel,
        }),
      },
    ],
    schema: AssessmentBundleSchema,
    schemaName: "submit_assessment_bundle",
    schemaDescription:
      "Submit the problem set and matching solution key for the week.",
    temperature: 0.3,
    maxTokens: 4096,
  });

  // Force weekNumber on both — the model can drift; the truth is the URL.
  const problemSet = { ...bundle.problemSet, weekNumber: input.weekNumber };
  const solutionKey = { ...bundle.solutionKey, weekNumber: input.weekNumber };

  await Promise.all([
    storage.saveProblemSet(input.courseId, input.weekNumber, problemSet),
    storage.saveSolutionKey(input.courseId, input.weekNumber, solutionKey),
  ]);

  return { problemSet, cached: false, weekNumber: ctx.week.weekNumber };
}

export interface GradingResult {
  submissionId: string;
  score: number;
  maxScore: number;
  normalized: number;
  feedback: GradedFeedback;
  weekNumber: number;
}

export async function submitAndGrade(input: {
  courseId: string;
  weekNumber: number;
  content: string;
}): Promise<GradingResult> {
  const ctx = await loadGradedContext(
    "grading",
    input.courseId,
    input.weekNumber,
  );
  if (!ctx.course) throw new Error(`Course ${input.courseId} not found`);
  if (!ctx.week) throw new Error(`Week ${input.weekNumber} not found`);
  if (!ctx.week.problemSet) {
    throw new Error(`Week ${input.weekNumber} has no problem set yet`);
  }
  if (!ctx.week.solutionKey) {
    throw new Error(`Week ${input.weekNumber} has no solution key yet`);
  }

  const submission = await storage.createSubmission(ctx.week.id, input.content);

  const feedback = await llm.generateStructured({
    system: GRADING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: gradingUserMessage({
          problemSet: ctx.week.problemSet,
          solutionKey: ctx.week.solutionKey,
          submission: input.content,
        }),
      },
    ],
    schema: GradedFeedbackSchema,
    schemaName: "submit_grade",
    schemaDescription:
      "Submit graded feedback comparing the student work to the solution key.",
    temperature: 0.2,
    maxTokens: 4096,
  });

  const maxScore = ctx.week.problemSet.problems.reduce(
    (s, p) => s + p.points,
    0,
  );
  const score = feedback.perProblem.reduce((s, f) => s + f.awarded, 0);
  const normalized = maxScore > 0 ? score / maxScore : 0;

  await storage.saveGrade(submission.id, score, maxScore, feedback);

  // Uniform mastery update across this week's key concepts.
  // The EMA in storage.recordConceptObservation smooths across multiple weeks.
  await Promise.all(
    ctx.week.keyConcepts.map((concept) =>
      storage.recordConceptObservation({
        courseId: input.courseId,
        concept,
        newScore: normalized,
      }),
    ),
  );

  return {
    submissionId: submission.id,
    score,
    maxScore,
    normalized,
    feedback,
    weekNumber: ctx.week.weekNumber,
  };
}
