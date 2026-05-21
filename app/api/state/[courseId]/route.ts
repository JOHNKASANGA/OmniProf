import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { requireOwnedCourse } from "@/lib/auth";

export const runtime = "nodejs";

interface Params {
  courseId: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { courseId } = await params;
  let course;
  try {
    ({ course } = await requireOwnedCourse(courseId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "Course not found")
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const [learningState, concepts] = await Promise.all([
    storage.getLearningStateView(courseId),
    storage.listConceptMastery(courseId),
  ]);
  return NextResponse.json({
    courseId,
    courseTitle: course.title,
    learningState,
    concepts,
  });
}
