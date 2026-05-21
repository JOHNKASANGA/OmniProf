import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { generateAssessment } from "@/lib/modes/assessment";
import { requireOwnedCourse } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Params {
  courseId: string;
  weekNumber: string;
}
const parseWeek = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isInteger(n) && n >= 1 ? n : null;
};

function authFail(err: unknown) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  if (msg === "Unauthorized")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (msg === "Course not found")
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { courseId, weekNumber: weekStr } = await params;
  const weekNumber = parseWeek(weekStr);
  if (weekNumber === null)
    return NextResponse.json({ error: "Invalid weekNumber" }, { status: 400 });
  try {
    await requireOwnedCourse(courseId);
  } catch (err) {
    const r = authFail(err);
    if (r) return r;
    throw err;
  }
  const week = await storage.getWeekForTutor(courseId, weekNumber);
  if (!week)
    return NextResponse.json({ error: "Week not found" }, { status: 404 });
  if (!week.problemSet) {
    return NextResponse.json(
      { error: "Problem set not yet generated; POST to create" },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { problemSet: week.problemSet, weekNumber },
    { status: 200 },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { courseId, weekNumber: weekStr } = await params;
  const weekNumber = parseWeek(weekStr);
  if (weekNumber === null)
    return NextResponse.json({ error: "Invalid weekNumber" }, { status: 400 });
  try {
    await requireOwnedCourse(courseId);
  } catch (err) {
    const r = authFail(err);
    if (r) return r;
    throw err;
  }
  const regenerate = new URL(req.url).searchParams.get("regenerate") === "true";
  try {
    const result = await generateAssessment({
      courseId,
      weekNumber,
      regenerate,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Assessment generation failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
