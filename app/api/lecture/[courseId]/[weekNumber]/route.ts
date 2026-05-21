import { NextResponse } from "next/server";
import { requireOwnedCourse } from "@/lib/auth";
import { generateLecture, getCachedLecture } from "@/lib/modes/lecture";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; weekNumber: string }> },
) {
  const { courseId, weekNumber } = await params;
  const week = parseInt(weekNumber, 10);
  try {
    await requireOwnedCourse(courseId);
    const lecture = await getCachedLecture(courseId, week);
    return NextResponse.json({ lecture });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "Course not found")
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; weekNumber: string }> },
) {
  const { courseId, weekNumber } = await params;
  const week = parseInt(weekNumber, 10);
  try {
    await requireOwnedCourse(courseId);
    const lecture = await generateLecture({ courseId, weekNumber: week });
    return NextResponse.json({ lecture });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "Course not found")
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
