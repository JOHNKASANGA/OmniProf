import { NextRequest, NextResponse } from "next/server";
import { extractStateFromTutorSession } from "@/lib/modes/state";
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

export async function POST(
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
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "Course not found")
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  try {
    const result = await extractStateFromTutorSession({ courseId, weekNumber });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: "State extraction failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
