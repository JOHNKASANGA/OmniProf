import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitAndGrade } from "@/lib/modes/assessment";
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
const RequestSchema = z.object({ content: z.string().min(1).max(50000) });

function authFail(err: unknown) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  if (msg === "Unauthorized")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (msg === "Course not found")
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return null;
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
  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
  try {
    const result = await submitAndGrade({
      courseId,
      weekNumber,
      content: body.content,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Submission/grading failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
