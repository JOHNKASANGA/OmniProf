import type { ProblemSet, SolutionKey } from "@/lib/state/schema";

export const GRADING_SYSTEM_PROMPT = `You are a university grader.

Compare a student's submitted answers against the solution key and produce structured feedback.

Rules:
- For each problem, award points between 0 and the problem's max.
- Calibration: trivial errors lose 0-20% of the points; methodological errors lose 30-60%; fundamentally wrong approach loses 60-100%.
- Each per-problem comment must name what went well AND what specifically went wrong. No generic praise. No "see solution".
- The overall comment is 2-4 sentences: a real summary, not a platitude. Note any pattern across problems if one exists.
- Blank answers receive 0 points; say so in the comment.
- Do not invent problems the student did not attempt; the perProblem array must contain one entry per problem in the problem set.`;

export function gradingUserMessage(input: {
  problemSet: ProblemSet;
  solutionKey: SolutionKey;
  submission: string;
}): string {
  return `Grade the following submission.

PROBLEM SET (the student saw this):
${JSON.stringify(input.problemSet, null, 2)}

SOLUTION KEY (your reference — the student did NOT see this):
${JSON.stringify(input.solutionKey, null, 2)}

STUDENT SUBMISSION:
${input.submission}

Produce the graded feedback.`;
}
