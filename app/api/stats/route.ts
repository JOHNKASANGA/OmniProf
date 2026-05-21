import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { requireStudent } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  let student;
  try {
    student = await requireStudent();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await storage.listCoursesForStudent(student.id);

  let totalConcepts = 0;
  let masteredConcepts = 0;
  let scoreSum = 0;
  let scoreMaxSum = 0;
  let submissionCount = 0;

  // listConceptMastery + listSubmissions per course; small N, fine for v1.
  for (const c of courses) {
    const mastery = await storage.listConceptMastery(c.id);
    totalConcepts += mastery.length;
    masteredConcepts += mastery.filter((m) => m.status === "mastered").length;

    // Submissions: iterate the course's weeks via curriculum to find weekIds.
    const curr = await storage.getCurriculum(c.id);
    if (!curr) continue;
    for (const w of curr.weeks) {
      // Resolve weekId by querying getWeekForTutor for week.id (we can use that — only need id).
      const wk = await storage.getWeekForTutor(c.id, w.weekNumber);
      if (!wk) continue;
      const subs = await storage.listSubmissions(wk.id);
      for (const s of subs) {
        if (s.score !== null && s.maxScore !== null && s.maxScore > 0) {
          scoreSum += s.score;
          scoreMaxSum += s.maxScore;
          submissionCount++;
        }
      }
    }
  }

  return NextResponse.json({
    totalConcepts,
    masteredConcepts,
    avgPerformance: scoreMaxSum > 0 ? scoreSum / scoreMaxSum : 0, // 0..1
    submissionCount,
  });
}
